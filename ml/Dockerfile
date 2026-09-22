FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer-cached)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and the pre-trained model
COPY app.py predict.py ./
COPY model/ ./model/

EXPOSE 5001

ENV ML_PORT=5001

CMD ["python", "app.py"]
