FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Run with Gunicorn
# -w 1: Single worker (can increase if needed)
# -b 0.0.0.0:5000: Bind to all interfaces
CMD ["gunicorn", "-w", "1", "-b", "0.0.0.0:5000", "api:app", "--access-logfile", "-", "--error-logfile", "-"]
