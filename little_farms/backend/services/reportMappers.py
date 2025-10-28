# reportMappers.py
def map_task_completion_data(raw_data, filter_type):
    """Transform raw data for task completion reports"""
    mapped_data = []
    
    for item in raw_data:
        task_data = {
            "Task Name": item.get("Task Name", ""),
            "Owner of Task": item.get("Owner of Task", ""),
            "Status": item.get("Status", ""),
            "Completion date": item.get("Completion date", "")
        }
        
        # Add appropriate field based on filter type
        if filter_type == "user":
            task_data["Project Name"] = item.get("Project Name", "")
        else:
            task_data["Assignee List"] = item.get("Assignee List", "")
            
        mapped_data.append(task_data)
    
    return mapped_data

def map_project_summary_data(raw_data):
    """Transform raw data for project summary reports"""
    return [
        {
            "Task Name": item.get("Task Name", ""),
            "Assignee List": item.get("Assignee List", ""),
            "Status": item.get("Status", ""),
            "Deadline": item.get("Deadline", "")
        }
        for item in raw_data
    ]

def map_logged_time_data(raw_data):
    """Transform raw data for logged time reports"""
    return [
        {
            "Project Name": item.get("Project Name", ""),
            "Task Name": item.get("Task Name", ""),
            "Staff Name": item.get("Staff Name", ""),
            "Department": item.get("Department", ""),
            "No. of Hours": item.get("No. of Hours", "0")
        }
        for item in raw_data
    ]

# Report mapper mapping
REPORT_MAPPERS = {
    'task-completion': map_task_completion_data,
    'team-summary': map_project_summary_data,
    'logged-time': map_logged_time_data
}