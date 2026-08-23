FROM python:3.12-slim

# Install Node.js and g++ compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create non-root runner user
RUN groupadd -r runner -g 10001 && \
    useradd -u 10001 -r -g runner -m -d /home/runner -s /bin/bash runner

WORKDIR /app

# Install python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app ./app
RUN chown -R runner:runner /app /home/runner

USER runner

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
