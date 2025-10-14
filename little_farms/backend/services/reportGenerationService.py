from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import sys
from datetime import datetime, timedelta
import random

def generate_schedule_report(filename="schedule_report.pdf"):
    # Mock data for the schedule report
    projects = [
        "Website Redesign",
        "Mobile App Development", 
        "Database Migration",
        "Marketing Campaign",
        "API Integration"
    ]
    
    # Generate mock tasks
    tasks = []
    statuses = ["Completed", "In Progress", "Under Review", "Planned"]
    priorities = ["High", "Medium", "Low"]
    
    for i in range(25):
        task = {
            "id": i + 1,
            "name": f"Task {i+1} - {random.choice(['Design', 'Development', 'Testing', 'Deployment', 'Documentation'])}",
            "project": random.choice(projects),
            "assignee": random.choice(["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "Tom Brown"]),
            "status": random.choice(statuses),
            "priority": random.choice(priorities),
            "due_date": (datetime.now() + timedelta(days=random.randint(-10, 30))).strftime("%Y-%m-%d"),
            "progress": random.randint(0, 100)
        }
        tasks.append(task)
    
    # Create PDF
    doc = SimpleDocTemplate(filename, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        textColor=colors.HexColor('#2E86AB')
    )
    
    # Title
    elements.append(Paragraph("Project Schedule Report", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Summary Statistics
    summary_data = [
        ["SCHEDULE SUMMARY", "", "", ""],
        ["Total Tasks", "Completed", "In Progress", "Under Review"],
        [str(len(tasks)), 
         str(len([t for t in tasks if t["status"] == "Completed"])),
         str(len([t for t in tasks if t["status"] == "In Progress"])),
         str(len([t for t in tasks if t["status"] == "Under Review"]))]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2E86AB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F0F0F0')),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Detailed Tasks Table
    elements.append(Paragraph("Detailed Task List", styles['Heading2']))
    elements.append(Spacer(1, 0.1*inch))
    
    # Table headers
    task_data = [["ID", "Task Name", "Project", "Assignee", "Status", "Priority", "Due Date", "Progress"]]
    
    # Add task rows with status-based coloring
    for task in tasks:
        status = task["status"]
        row_color = colors.white
        
        if status == "Completed":
            row_color = colors.HexColor('#D4EDDA')  # Light green
        elif status == "In Progress":
            row_color = colors.HexColor('#FFF3CD')  # Light yellow
        elif status == "Under Review":
            row_color = colors.HexColor('#CCE5FF')  # Light blue
        
        task_data.append([
            str(task["id"]),
            task["name"],
            task["project"],
            task["assignee"],
            task["status"],
            task["priority"],
            task["due_date"],
            f"{task['progress']}%"
        ])
    
    task_table = Table(task_data, colWidths=[0.4*inch, 1.5*inch, 1.2*inch, 1*inch, 0.8*inch, 0.7*inch, 0.9*inch, 0.7*inch])
    task_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#343A40')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (1, 1), (-1, -1), colors.white),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [row_color for row in task_data[1:]])
    ]))
    
    elements.append(task_table)
    
    # Status Legend
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph("Status Legend", styles['Heading3']))
    
    legend_data = [
        ["Status", "Color", "Description"],
        ["Completed", "🟢 Green", "Tasks that are finished and approved"],
        ["In Progress", "🟡 Yellow", "Tasks currently being worked on"],
        ["Under Review", "🔵 Blue", "Tasks awaiting review/approval"],
        ["Planned", "⚪ White", "Tasks scheduled for future work"]
    ]
    
    legend_table = Table(legend_data, colWidths=[1.5*inch, 1*inch, 3*inch])
    legend_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6C757D')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ]))
    
    elements.append(legend_table)
    
    # Footer with generation date
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph(f"Report generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 
                             ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
    
    # Build PDF
    doc.build(elements)
    return True

if __name__ == "__main__":
    try:
        filename = sys.argv[1] if len(sys.argv) > 1 else "schedule_report.pdf"
        success = generate_schedule_report(filename)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error generating schedule report: {str(e)}", file=sys.stderr)
        sys.exit(1)