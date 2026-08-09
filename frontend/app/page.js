// app/page.js (for App Router) or pages/index.js (for Pages Router)
"use client"; // Only needed if you are using the App Router
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import HomeClient from "./Components/HomeClient";
 // For App Router
// import { useRouter } from "next/router"; // For Pages Router

export default function Page() {
  return <HomeClient />;
}
