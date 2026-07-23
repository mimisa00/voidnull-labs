cat > Modelfile << 'EOF'
FROM qwen3-coder:30b
PARAMETER num_ctx 32768
EOF

ollama create qwen3-coder-32k -f Modelfile