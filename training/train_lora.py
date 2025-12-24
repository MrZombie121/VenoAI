import json
import os
from dataclasses import dataclass

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)


MODEL_NAME = os.environ.get("BASE_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")
DATA_PATH = os.environ.get("DATA_PATH", os.path.join("training", "data.jsonl"))
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", os.path.join("training", "output", "veno-1.0-free-lora"))
MAX_LEN = int(os.environ.get("MAX_LEN", "512"))


def load_dataset(path: str) -> Dataset:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return Dataset.from_list(rows)


def format_example(example: dict) -> str:
    instruction = example.get("instruction", "").strip()
    response = example.get("response", "").strip()
    return f"<|user|>\n{instruction}\n<|assistant|>\n{response}"


@dataclass
class TokenizedBatch:
    input_ids: list
    attention_mask: list
    labels: list


def tokenize_batch(batch, tokenizer):
    texts = [format_example(ex) for ex in batch]
    enc = tokenizer(
        texts,
        truncation=True,
        max_length=MAX_LEN,
        padding=False,
    )
    enc["labels"] = enc["input_ids"].copy()
    return enc


def main():
    dataset = load_dataset(DATA_PATH)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        load_in_4bit=True,
        torch_dtype=torch.float16,
        device_map="auto",
    )
    model = prepare_model_for_kbit_training(model)

    lora_config = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, lora_config)

    tokenized = dataset.map(
        lambda batch: tokenize_batch(batch, tokenizer),
        batched=True,
        remove_columns=dataset.column_names,
    )

    args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        num_train_epochs=2,
        learning_rate=2e-4,
        bf16=False,
        fp16=True,
        logging_steps=10,
        save_steps=200,
        save_total_limit=2,
        evaluation_strategy="no",
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized,
        data_collator=DataCollatorForLanguageModeling(tokenizer, mlm=False),
    )

    trainer.train()
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    print(f"Saved LoRA adapter to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
