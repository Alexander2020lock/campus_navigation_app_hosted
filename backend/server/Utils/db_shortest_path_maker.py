from .building_handling import get_building_paths
from . import db_access
from . import graph_converter


class AmbiguousValueError(Exception):
    pass


def get_msb(description: str) -> int:
    digits = "".join(filter(str.isdigit, description))

    return int(digits[0]) if digits else None


def is_valid_digit(description: str) -> bool:
    digits = "".join(filter(str.isdigit, description))
    return len(digits) > 0 and len(digits) <= 3


def validate_and_process_start_end(start: str, end: str):
    msb_start = get_msb(start)
    msb_end = get_msb(end)

    if not is_valid_digit(start) and not is_valid_digit(end):
        if (
            msb_start is None
            and msb_end is None
            and (start not in "Stairs" and end not in "Stairs")
        ):
            raise AmbiguousValueError(
                "Both `start` and `end` are invalid or non-digit descriptions."
            )
        elif msb_start is None:
            msb_start = msb_end
        elif msb_end is None:
            msb_end = msb_start
    elif not is_valid_digit(start):
        msb_start = msb_end
        if msb_start is None:
            raise AmbiguousValueError("Cannot derive MSB from `end` as it is invalid.")
    elif not is_valid_digit(end):
        msb_end = msb_start
        if msb_end is None:
            raise AmbiguousValueError(
                "Cannot derive MSB from `start` as it is invalid."
            )

    if msb_start != msb_end:
        if start.isalpha() or " " in start:
            msb_start = msb_end
        elif end.isalpha() or " " in end:
            msb_end = msb_start

    if msb_start is None or msb_end is None:
        raise AmbiguousValueError("Invalid MSB values derived from input.")

    if start.isdigit() and len(start) > 3:
        raise AmbiguousValueError(
            "Digit length of `start` exceeds the allowed limit (3)."
        )
    if end.isdigit() and len(end) > 3:
        raise AmbiguousValueError(
            "Digit length of `end` exceeds the allowed limit (3)."
        )

    return msb_start, msb_end


def get_exact_node(graph, coordinates, floor):
    for node, data in graph.nodes(data=True):
        if (
            data["x"] == coordinates[0]
            and data["y"] == coordinates[1]
            and data["floor"] == floor
        ):
            return node
    print("Exact node not found for the given coordinates.")
    return None


def interpret_path(graph, path):
    return [(graph.nodes[node]["x"], graph.nodes[node]["y"]) for node in path]


def get_lift_stairs(db_path, floor, graph, coords, preference):
    if preference == "Lift":
        lifts_stairs_start = db_access.get_coordinates(db_path, "Lift %", floor)
    elif preference == "Stairs":
        lifts_stairs_start = db_access.get_coordinates(db_path, "Stairs %", floor)
    else:
        lifts_stairs_start = db_access.get_coordinates(
            db_path, "Lift %", floor
        ) + db_access.get_coordinates(db_path, "Stairs %", floor)

    if not lifts_stairs_start:
        raise AmbiguousValueError(f"No lifts or stairs found on floor {floor}.")

    min_weight = float("inf")
    best_path_to_lift = None
    best_lift = None

    start_node = get_exact_node(graph, coords, floor)

    for lift_stair in lifts_stairs_start:
        lift_stair_node = get_exact_node(graph, lift_stair, floor)
        path, weight = graph_converter.find_shortest_path(
            graph, start_node, lift_stair_node
        )

        if weight < min_weight:
            min_weight = weight
            best_path_to_lift = path
            best_lift = lift_stair

    if not best_path_to_lift:
        raise AmbiguousValueError(f"Could not find a path to lifts or stairs '.")

    return {
        "min_weight": min_weight,
        "best_path_to_lift": best_path_to_lift,
        "best_lift": best_lift,
    }


def handle_different_msb(
    db_path,
    graph_start,
    graph_end,
    start_coords,
    end_coords,
    floor_start,
    floor_end,
    preference,
):
    try:
        lift_stairs = get_lift_stairs(
            db_path, floor_start, graph_start, start_coords, preference
        )

        lift_description = db_access.get_description(
            db_path, lift_stairs["best_lift"], floor_start
        )
        lift_coords_end = db_access.get_coordinates(
            db_path, lift_description[0], floor_end
        )
        if not lift_coords_end:
            raise AmbiguousValueError(
                f"Matching lift/stair '{lift_description}' not found on floor {floor_end}."
            )
        lift_node_end = get_exact_node(graph_end, lift_coords_end[0], floor_end)

        end_node = get_exact_node(graph_end, end_coords, floor_end)

        path_from_lift, weight_from_lift = graph_converter.find_shortest_path(
            graph_end, lift_node_end, end_node
        )

        combined_path = [
            [
                floor_start,
                interpret_path(graph_start, lift_stairs["best_path_to_lift"]),
            ],
            [floor_end, interpret_path(graph_end, path_from_lift)],
        ]
        total_weight = lift_stairs["min_weight"] + weight_from_lift

        return {
            "path": combined_path,
            "total_weight": total_weight,
            "complexity": "complex",
            "error": None,
        }

    except AmbiguousValueError as e:
        return {
            "path": None,
            "total_weight": None,
            "complexity": None,
            "error": str(e),
        }
    except Exception as e:
        return {
            "path": None,
            "total_weight": None,
            "complexity": None,
            "error": f"Unexpected Error: {str(e)}",
        }


def main(
    db_path,
    start_description,
    end_description,
    preference=None,
):
    try:
        floor_start, floor_end = validate_and_process_start_end(
            start_description, end_description
        )

        graph_start = graph_converter.create_graph_from_db(db_path, floor_start)
        graph_end = (
            graph_converter.create_graph_from_db(db_path, floor_end)
            if floor_start != floor_end
            else graph_start
        )

        start_coords = db_access.get_coordinates(
            db_path, start_description, floor_start
        )
        if not start_coords:
            thorough_result = db_access.get_coordinates_thorough(
                db_path, start_description
            )
            if not thorough_result:
                raise AmbiguousValueError(
                    f"Start location '{start_description}' not found anywhere in the database."
                )
            start_coords, floor_start = thorough_result[0:2], thorough_result[2]
            graph_start = graph_converter.create_graph_from_db(db_path, floor_start)

        end_coords = db_access.get_coordinates(db_path, end_description, floor_end)
        if not end_coords:
            thorough_result = db_access.get_coordinates_thorough(
                db_path, end_description
            )
            if not thorough_result:
                raise AmbiguousValueError(
                    f"End location '{end_description}' not found anywhere in the database."
                )
            end_coords, floor_end = thorough_result[0:2], thorough_result[2]
            graph_end = graph_converter.create_graph_from_db(db_path, floor_end)

        if len(start_coords) == 1:
            start_coords = start_coords[0]
        if len(end_coords) == 1:
            end_coords = end_coords[0]

        if start_description in {"Lift", "Stairs"}:
            result = get_lift_stairs(
                db_path, floor_start, graph_start, end_coords, start_description
            )
            if not result:
                raise AmbiguousValueError(
                    f"No lifts or stairs found on floor {floor_start} for '{start_description}'."
                )
            start_coords = result["best_lift"]
        elif end_description in {"Lift", "Stairs"}:
            result = get_lift_stairs(
                db_path, floor_end, graph_end, start_coords, end_description
            )
            if not result:
                raise AmbiguousValueError(
                    f"No lifts or stairs found on floor {floor_end} for '{end_description}'."
                )
            end_coords = result["best_lift"]

        if floor_start == floor_end:
            start_node = get_exact_node(graph_start, start_coords, floor_start)
            end_node = get_exact_node(graph_start, end_coords, floor_start)

            if start_node is None or end_node is None:
                raise AmbiguousValueError(
                    "Could not determine start or end node in the graph."
                )

            shortest_path, weight = graph_converter.find_shortest_path(
                graph_start, start_node, end_node
            )

            return {
                "path": [floor_start, interpret_path(graph_start, shortest_path)],
                "total_weight": weight,
                "complexity": "simple",
                "error": None,
            }

        else:
            return handle_different_msb(
                db_path,
                graph_start,
                graph_end,
                start_coords,
                end_coords,
                floor_start,
                floor_end,
                preference,
            )

    except Exception as e:
        return {
            "path": None,
            "total_weight": None,
            "complexity": None,
            "error": str(e),
        }


def get_building_entrance_exit(db_path, building_name, reference_point):
    entrances = db_access.get_coordinates(db_path, f"%Entry%", 0)
    if not entrances:
        raise AmbiguousValueError(f"No entrance found for building '{building_name}'.")

    min_weight = float("inf")
    best_entrance = None
    best_path_data = {}
    if len(entrances) > 1:
        for entrance in entrances:
            entrance_des = db_access.get_description(db_path, entrance, 0)[0]
            path_data = main(db_path, reference_point, entrance_des)
            if not path_data["error"] and path_data["total_weight"] < min_weight:
                min_weight = path_data["total_weight"]
                best_entrance = entrance
                best_path_data = path_data
    else:
        entrance_des = db_access.get_description(db_path, entrances[0], 0)[0]
        best_path_data = main(db_path, reference_point, entrance_des)
        best_entrance = entrances[0]

    if not best_entrance:
        raise AmbiguousValueError(
            f"Could not determine the best entrance for '{building_name}'."
        )

    return best_entrance, best_path_data


def multi_building_nav(
    db_path_1,
    building_name1: str,
    start_1: str,
    db_path_2,
    building_name2: str,
    end_2: str,
):
    try:
        path_building_1 = {}
        path_building_2 = {}
        _, path_building_1 = get_building_entrance_exit(
            db_path_1, building_name1, start_1
        )


        _, path_building_2 = get_building_entrance_exit(
            db_path_2, building_name2, end_2
        )


        if not isinstance(path_building_1, dict) or path_building_1.get("error") or not isinstance(path_building_2, dict) or path_building_2.get("error"):
            err_msg = (
                (path_building_1.get("error") if isinstance(path_building_1, dict) else None)
                or (path_building_2.get("error") if isinstance(path_building_2, dict) else None)
                or "Failed to compute multi-building path"
            )
            return {
                "path": None,
                "total_weight": None,
                "complexity": None,
                "error": err_msg,
            }

        total_weight = (path_building_1.get("total_weight") or 0) + (
            path_building_2.get("total_weight") or 0
        )
        full_path = {
            building_name1: path_building_1,
            building_name2: path_building_2,
        }



        return {
            "path": full_path,
            "total_weight": total_weight,
            "complexity": "multi-building",
            "error": None,
        }

    except Exception as e:
        return {
            "path": None,
            "total_weight": None,
            "complexity": None,
            "error": str(e),
        }


def example():
    start_description = "001"
    end_description = "002"

    result = multi_building_nav(
        building_name1="AB-01",
        start_1=start_description,
        building_name2="Lab-Complex",
        end_2=end_description,
    )  # type: ignore
    print("Result:", result)


if __name__ == "__main__":
    example()
