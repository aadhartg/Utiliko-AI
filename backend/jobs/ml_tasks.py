from celery_app import celery_app
from ml.train import train
from core.config import settings
from core.logger import logger
import os

@celery_app.task(name="trigger_ml_training")
def trigger_ml_training(data_dir=None, output_dir=None):
    """
    Background task to retrain the lead scoring model.
    """
    if data_dir is None:
        data_dir = os.path.join(os.getcwd(), "data")
    if output_dir is None:
        output_dir = os.path.join(os.getcwd(), "ml", "models")
    
    logger.info("bg_training_start", data_dir=data_dir)
    try:
        metadata = train(data_dir, output_dir)
        logger.info("bg_training_complete", version=metadata.get("model_version"))
        return metadata
    except Exception as e:
        logger.error("bg_training_failed", error=str(e))
        raise
