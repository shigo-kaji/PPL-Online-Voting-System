import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

from .models import Election, Vote

def generate_election_report_pdf(election: Election):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)

    styles = getSampleStyleSheet()
    
    elements = []

    # Header
    title_style = styles['Heading1']
    elements.append(Paragraph(election.title, title_style))
    elements.append(Spacer(1, 0.2 * inch))

    # Duration and details
    start_str = election.starts_at.strftime("%B %d, %Y %I:%M %p")
    end_str = election.ends_at.strftime("%B %d, %Y %I:%M %p")
    
    details_text = f"<b>Duration:</b> {start_str} to {end_str}"
    elements.append(Paragraph(details_text, styles['Normal']))
    if election.description:
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>Details:</b> {election.description}", styles['Normal']))
    
    elements.append(Spacer(1, 0.3 * inch))

    # Candidates and Votes
    candidates = election.candidates.all()
    for candidate in candidates:
        elements.append(Paragraph(candidate.name, styles['Heading2']))
        elements.append(Spacer(1, 0.1 * inch))

        votes = Vote.objects.filter(election=election, candidate=candidate).select_related('voter')
        
        if votes.exists():
            data = [["Reference # of the Voter", "Date Submitted"]]
            for vote in votes:
                # Using username or ID as the reference # of the voter
                data.append([str(vote.voter.username or vote.voter.id), vote.cast_at.strftime("%B %d, %Y %I:%M %p")])
            
            t = Table(data, colWidths=[2.5 * inch, 2.5 * inch])
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
        else:
            elements.append(Paragraph("No votes.", styles['Normal']))

        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph(f"<b>Total votes:</b> {votes.count()}", styles['Normal']))
        elements.append(Spacer(1, 0.3 * inch))

    # Footer
    elements.append(Spacer(1, 0.5 * inch))
    footer_text = f"Reference # of the event / position: {election.id}"
    elements.append(Paragraph(footer_text, styles['Italic']))

    doc.build(elements)
    buffer.seek(0)
    return buffer
