from .loader import env_variables


def get_building_paths(building_name):

    building_map = {
        "AB-01": ("ab01-01.db", "AB-01"),
        "Lab-Complex": ("lab.db", "Lab-Complex"),
    }

    if building_name in building_map:
        db_filename, floor_map_name = building_map[building_name]

        db_path = env_variables["db_path"] / db_filename
        floor_map_path = env_variables["floor_map"] / floor_map_name
        output_map_path = env_variables["output_map"] / floor_map_name

        return db_path, floor_map_path, output_map_path
    else:
        raise ValueError(
            f"Building name '{building_name }' not found in the configuration."
        )


if __name__ == "__main__":
    building_name = "AB-01"
    try:
        db_path, floor_map_path = get_building_paths(building_name)
        print(f"DB Path: {db_path }")
        print(f"Floor Map Path: {floor_map_path }")
    except ValueError as e:
        print(e)
