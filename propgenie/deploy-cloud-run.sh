#!/bin/bash
# Exit immediately if a command exits with a non-zero status
set -e

PROJECT_ID=$(gcloud config get-value project)
REGION="us-east1"
SERVICE_NAME="propgenie-backend"

echo "=========================================================="
echo "PropGenie Production Deployer for Google Cloud Run"
echo "Target Project: $PROJECT_ID"
echo "Target Region:  $REGION"
echo "=========================================================="

# 1. Check if Secret Manager API is enabled
echo "Verifying GCP APIs..."
gcloud services enable secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com

# 2. Check or create secrets in Secret Manager if missing
echo "Checking required production credentials in Secret Manager..."

check_or_create_secret() {
  SECRET_NAME=$1
  DESC=$2
  if ! gcloud secrets describe "$SECRET_NAME" >/dev/null 2>&1; then
    echo "Creating secret '$SECRET_NAME' ($DESC)..."
    gcloud secrets create "$SECRET_NAME" --replication-policy="automatic"
    echo "Please configure the value for '$SECRET_NAME' by running:"
    echo "  echo -n 'YOUR_SECRET_VALUE' | gcloud secrets versions add $SECRET_NAME --data-file=-"
  else
    echo "✓ Secret '$SECRET_NAME' is present."
  fi
}

check_or_create_secret "gmail-user" "Gmail/Google account email address"
check_or_create_secret "gmail-app-password" "Gmail App Password for SMTP alerts"
check_or_create_secret "calendar-id" "Google Calendar ID to write appointments"

# 3. Build container via Cloud Build
echo "Submitting build to Google Cloud Build..."
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" .

# 4. Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME:latest" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --update-env-vars "GMAIL_USER=backend@propgenie.com" \
  --update-secrets "GMAIL_APP_PASSWORD=gmail-app-password:latest,CALENDAR_ID=calendar-id:latest" \
  --memory "2Gi" \
  --cpu "1"

echo "=========================================================="
echo "Deployment Complete!"
echo "Make sure the Cloud Run runtime service account has Secret Manager secretAccessor role"
echo "=========================================================="
