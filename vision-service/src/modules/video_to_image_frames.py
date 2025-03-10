import cv2
import os
import logging
from PIL import Image

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def video_to_image_paths(video_path, delay, output_dir="frames"):
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Create a list to store the frame file paths
    frame_paths = []

    # Open the video file
    cap = cv2.VideoCapture(video_path)

    # Check if the video opened successfully
    if not cap.isOpened():
        print("Error: Could not open video.")
        return frame_paths

    # Get the video's frame rate
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * delay)  # Capture one frame every `delay` seconds

    frame_count = 0  # Initialize frame counter
    frame_index = 0  # Index for saved frames
    while True:
        ret, frame = cap.read()
        if not ret:
            break  # Exit loop if no frames are left

        # Capture one frame per `delay` seconds
        if frame_count % frame_interval == 0:
            # Convert the frame from BGR (OpenCV format) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Convert the NumPy array (frame_rgb) to a Pillow Image
            image = Image.fromarray(frame_rgb)

            # Save the frame as an image file
            frame_path = os.path.join(output_dir, f"frame_{frame_index:04d}.jpg")
            image.save(frame_path)

            # Append the saved frame path to the list
            frame_paths.append(frame_path)
            frame_index += 1  # Increment frame index

        frame_count += 1  # Increment the frame counter

    # Release the video capture object
    cap.release()
    logger.info(f"The no. of video frames captured is: {len(frame_paths)}")
    return frame_paths
