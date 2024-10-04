import cv2
from PIL import Image

def video_to_image_array(video_path, delay):
    # Create a list to store the images
    image_array = []

    # Open the video file
    cap = cv2.VideoCapture(video_path)

    # Check if the video opened successfully
    if not cap.isOpened():
        print("Error: Could not open video.")
        return image_array

    # Get the video's frame rate
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * delay)  # Capture one frame every delay seconds

    frame_count = 0  # Initialize frame counter
    while True:
        ret, frame = cap.read()
        if not ret:
            break  # Exit loop if no frames are left

        # Capture one frame per second
        if frame_count % frame_interval == 0:
            # Convert the frame from BGR (OpenCV format) to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # Convert the NumPy array (frame_rgb) to a Pillow Image
            image = Image.fromarray(frame_rgb)

            # Append the image to the list
            image_array.append(image)

        frame_count += 1  # Increment the frame counter

    # Release the video capture object
    cap.release()

    return image_array
