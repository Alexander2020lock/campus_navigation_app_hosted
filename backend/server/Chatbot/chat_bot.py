from pathlib import Path
import sqlite3
from rapidfuzz import process, fuzz
from rank_bm25 import BM25Okapi
import requests
import spacy
import random
import re
from .__init__ import env_variables

# API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-small"
# headers = {"Authorization": f"Bearer {env_variables ['hf_api_key']}"}

API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
headers = {
    "Authorization": f"Bearer {env_variables.get('gemini_api_key', '')}",
    "Content-Type": "application/json",
}


import os


def gemini_query(
    messages,
    model=os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
    temperature=0.1,
    max_tokens=150,
):

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    response = requests.post(API_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()


class Chatbot:
    def __init__(
        self, db_path=env_variables["teacher_des"], spacy_model="en_core_web_sm"
    ):

        self.nlp = spacy.load(spacy_model)
        self.db_path = Path(db_path)

        self.knowledge = self._create_knowledge_base()

        self.model_params = {
            "temperature": 0.1,
            "max_new_tokens": 150,
            "do_sample": True,
            # "return_full_text": False,
        }

        self.fallback_responses = [
            "I don't have specific information about that.",
            "That detail isn't available in my knowledge base.",
            "I can only answer based on the information I have about the teacher.",
        ]

    def _preprocess_text(self, text):

        return [
            token.text.lower()
            for token in self.nlp(text)
            if not token.is_stop and not token.is_punct
        ]

    def _create_knowledge_base(self):

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            result = cursor.execute("SELECT question, answer FROM qa").fetchall()
            teacher_rows = cursor.execute("SELECT name, cabin_no, room_no FROM teachers").fetchall()

        questions = [qa[0] for qa in result]
        answers = {qa[0]: qa[1] for qa in result}
        teachers_dir = {row[0].lower(): (row[0], row[1], row[2]) for row in teacher_rows}
        tokenized_questions = [self._preprocess_text(q) for q in questions]

        return {
            "questions": questions,
            "answers": answers,
            "teachers_dir": teachers_dir,
            "bm25": BM25Okapi(tokenized_questions) if tokenized_questions else None,
            "tokenized_questions": tokenized_questions,
        }

    def reload_knowledge_base(self):

        self.knowledge = self._create_knowledge_base()

    def _extract_name_from_text(self, text):
        clean = re.sub(
            r"^(who is|what is|where is|tell me about|information about|details of|dr\.?|prof\.?|professor)\s+",
            "",
            text.strip(),
            flags=re.IGNORECASE,
        )
        clean = re.sub(r"^(dr\.?|prof\.?|professor)\s+", "", clean, flags=re.IGNORECASE)
        return re.sub(r"[?.,!]", "", clean).strip().lower()

    def get_best_match(self, user_input):

        if not self.knowledge["questions"]:
            return None, 0

        user_name = self._extract_name_from_text(user_input)

        fuzzy_result = process.extractOne(
            user_input, self.knowledge["questions"], scorer=fuzz.token_set_ratio
        )
        fuzzy_match, fuzzy_score = (
            (fuzzy_result[0], fuzzy_result[1]) if fuzzy_result else (None, 0)
        )

        if fuzzy_match:
            candidate_name = self._extract_name_from_text(fuzzy_match)
            if len(user_name) >= 3 and len(candidate_name) >= 3:
                name_ratio = max(
                    fuzz.ratio(user_name, candidate_name),
                    fuzz.partial_ratio(user_name, candidate_name),
                )
                if name_ratio < 65:
                    return None, 0

        if fuzzy_score >= 65:
            return fuzzy_match, fuzzy_score

        return None, 0

    def extract_question_keywords(self, user_input):

        doc = self.nlp(user_input)

        education_terms = [
            "degree",
            "phd",
            "qualification",
            "graduated",
            "university",
            "college",
            "department",
            "position",
            "role",
            "teach",
            "specialization",
            "research",
            "expertise",
            "course",
        ]

        entities = [ent.text.lower() for ent in doc.ents]

        keywords = []
        for token in doc:
            if token.text.lower() in education_terms or token.pos_ == "PROPN":
                keywords.append(token.text.lower())

            elif token.pos_ == "NOUN" and not token.is_stop:
                keywords.append(token.text.lower())

        keywords.extend(entities)

        return list(set(keywords))

    def verify_response_relevance(self, teacher_info, response, keywords):
        if not response or len(response.split()) < 2:
            return False

        context_words = set(
            w for w in re.findall(r"\w+", teacher_info.lower()) if len(w) >= 3
        )
        response_words = set(
            w for w in re.findall(r"\w+", response.lower()) if len(w) >= 3
        )

        if not response_words:
            return False

        context_overlap = response_words & context_words
        keyword_overlap = response_words & set(
            k.lower() for k in keywords if len(k) >= 3
        )

        if len(context_overlap) >= 1 or keyword_overlap:
            return True

        return False

    def ensure_complete_sentences(self, text):

        if not text or len(text) < 5:
            return text

        text = text.strip()
        end_punct = [".", "!", "?"]

        if text[-1] not in end_punct:
            last_period = max(text.rfind("."), text.rfind("!"), text.rfind("?"))

            if last_period != -1 and last_period > len(text) * 0.7:
                return text[: last_period + 1]
            else:
                return text + "."

        return text

    def query_gemini_model(self, teacher_info, user_input):
        keywords = self.extract_question_keywords(user_input)

        context = f"""You are a helpful assistant that provides accurate answers about teachers using ONLY the information in the context.
    NEVER make up information or facts not present in the context. If the answer is not in the context, say you don't have that information.
        Answer directly and concisely in 1-2 COMPLETE sentences based EXCLUSIVELY on the context provided.
        Always finish your sentences with proper punctuation.

    Context Information:
    {teacher_info}

    Question: {user_input}"""

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that answers based only on the context provided.",
            },
            {"role": "user", "content": context},
        ]

        try:
            response = gemini_query(messages)
            generated_text = response["choices"][0]["message"]["content"]

            cleaned_response = re.sub(
                r"^(Based on the context provided|Based on the context|According to the context|According to the provided context|From the context provided|From the context|I think|Based on|According to)[\s,:]*",
                "",
                generated_text,
                flags=re.IGNORECASE,
            ).strip()
            cleaned_response = re.sub(r"\*\*|\*", "", cleaned_response)

            if cleaned_response and cleaned_response[0].islower():
                cleaned_response = cleaned_response[0].upper() + cleaned_response[1:]

            complete_response = self.ensure_complete_sentences(cleaned_response)

            is_relevant = self.verify_response_relevance(
                teacher_info, complete_response, keywords
            )
            if is_relevant:
                return complete_response
            else:
                return None

        except Exception as e:
            return None

    def format_answer_summary(self, text):
        if not text:
            return text
        lines = [line.strip("- *").strip() for line in text.split("\n") if line.strip()]
        if len(lines) > 2:
            return " ".join(lines[:2])
        return text.strip()

    def respond(self, user_input):

        match, score = self.get_best_match(user_input)
        if match:
            base_answer = self.knowledge["answers"].get(match, None)
            if base_answer:
                gemini_res = self.query_gemini_model(base_answer, user_input)
                if gemini_res:
                    return gemini_res
                summary = self.format_answer_summary(base_answer)
                return self.ensure_complete_sentences(summary)

        # Fallback to teacher directory lookup if not present in QA table
        user_name = self._extract_name_from_text(user_input)
        if user_name and "teachers_dir" in self.knowledge:
            for t_lower, (name, cabin, room) in self.knowledge["teachers_dir"].items():
                if fuzz.ratio(user_name, t_lower) > 70 or (len(user_name) >= 4 and user_name in t_lower):
                    cabin_str = f"Cabin: {cabin}" if cabin else "Cabin: N/A"
                    room_str = f"Room: {room}" if room else "Room: N/A"
                    return f"{name.title()} is a faculty member at VIT Bhopal ({cabin_str}, {room_str})."

        return random.choice(self.fallback_responses)





if __name__ == "__main__":
    chatbot = Chatbot()
    print(chatbot.respond("how many years of experience does ravi verma have"))
