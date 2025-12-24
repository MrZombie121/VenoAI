# LoRA training (local, Windows)

This folder contains a minimal LoRA training setup you can run locally.
It is designed for a small GPU (GTX 1660 Ti, 6GB). Keep the dataset small.

## 1) Prepare data
Edit `training/data.jsonl` and add your own samples.
Each line is a JSON object with `instruction` and `response`.

## 2) Create a Python venv
```
py -3.10 -m venv .venv
.\.venv\Scripts\activate
```

## 3) Install deps
```
pip install -r training/requirements.txt
```

## 4) Train LoRA
```
python training/train_lora.py
```

Output will be saved to: `training/output/veno-1.0-free-lora`

## Notes
- This is LoRA fine-tuning for a base model (default: Llama-3.1-8B-Instruct).
- For 1660 Ti, keep sequence length small (512) and batch size 1.
- This creates LoRA adapters only. To use them in production you need to
  load the base model + LoRA adapter together.
