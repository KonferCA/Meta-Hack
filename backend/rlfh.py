from llama import Llama

generator = Llama.build(
    ckpt_dir="../.llama/checkpoints/Llama-3.2-11B-Vision",
    tokenizer_path="../.llama/checkpoints/Llama-3.2-11B-Vision/tokenizer.model",
    max_seq_len=128,
    max_batch_size=4,
)
