from .video_to_image_frames import video_to_image_array
from .models import processor,model
from transformers import GenerationConfig

def process_video(url, delay=1):
    video_frames = video_to_image_array(url, delay=delay)
    all_video_frames_results = list()
    generated_text = ""
    for i in range(len(video_frames)):
        input_text = f"Explain the scene {i+1} of a video within 100 words and the summary should not exceed more than 100 words, must remember it."
        if len(generated_text):
            input_text += f"Here is the description of previous scene: \n{generated_text}.\n * Strictly Do not repeat the same description of previous scene in current scene {i+1} and only tell about what happened next in the current scene {i+1} as compared to previous scene. Strictly, explain only what changed in the current scene {i+1} as compared to the previous scene described.*"
        inputs = processor.process(
            images=[video_frames[i]],
            text=input_text,
        )
        inputs = {k: v.to(model.device).unsqueeze(0) for k, v in inputs.items()}
        # generate output; maximum 200 new tokens; stop generation when <|endoftext|> is generated
        output = model.generate_from_batch(
            inputs,
            GenerationConfig(max_new_tokens=200, stop_strings="<|endoftext|>"),
            tokenizer=processor.tokenizer,
        )
        # only get generated tokens; decode them to text
        generated_tokens = output[0, inputs["input_ids"].size(1):]
        generated_text = processor.tokenizer.decode(generated_tokens, skip_special_tokens=True)
        all_video_frames_results.append(generated_text)

    for i, result in enumerate(all_video_frames_results):
        all_video_frames_results[i] = {'time': i * delay, 'text': result}

    return all_video_frames_results
