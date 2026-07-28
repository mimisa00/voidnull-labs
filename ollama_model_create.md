cat > Modelfile << 'EOF'
FROM qwen3-coder:30b
PARAMETER num_ctx 65536
EOF

ollama create qwen3-coder-64k -f Modelfile