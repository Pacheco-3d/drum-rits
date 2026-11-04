# Drum Rits — recuperação do Codex

Arquivos extraídos da prévia HTML salva no arquivo `Bateria Drum-ritmos_files.zip` enviado pelo usuário.

O `index.html` foi enviado separadamente pelo usuário; os demais arquivos foram recuperados dos recursos base64 incorporados na prévia do Codex.

## Executar

Abra `index.html` em um navegador. Para testar por servidor local, use `python -m http.server 8000` e acesse http://localhost:8000.

## Limitação conhecida

Os samples WAV e a biblioteca `library/manifest.json` referenciados na prévia **não estavam presentes no ZIP recebido**. O modo sintético deve ser possível sem as amostras, mas timbres acústicos exigem arquivos adicionais. Alguns recursos de Android também dependem do aplicativo nativo.

Não inclui o restante da sessão/repositório local original do Codex.