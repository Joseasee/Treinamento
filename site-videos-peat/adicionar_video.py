"""Junta e comprime vídeos para o site. O arquivo final fica abaixo de 100 MB (limite do GitHub).

Uso (dentro da pasta do site, com o ffmpeg instalado):
    python adicionar_video.py slug "Título do vídeo" parte1.mp4 [parte2.mp4 ...]

Gera videos/<slug>.mp4 e posters/<slug>.jpg e imprime a linha para colar na lista VIDEOS do index.html.
"""
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) < 4:
    sys.exit(__doc__)
slug, titulo, *entradas = sys.argv[1:]

ALVO = 95 * 1024 * 1024  # bytes: margem abaixo dos 100 MiB do GitHub
AUDIO = 80_000           # bits/s


def ffprobe(*args):
    cmd = ["ffprobe", "-v", "error", "-of", "csv=p=0", *args]
    return subprocess.check_output(cmd, text=True).strip()


w, h = ffprobe("-select_streams", "v:0", "-show_entries", "stream=width,height", entradas[0]).split(",")[:2]
durs = [float(ffprobe("-show_entries", "format=duration", e)) for e in entradas]
total = sum(durs)
# teto de bitrate calculado para o arquivo final nunca passar de ALVO
video_bps = max(150_000, int(ALVO * 8 / total - AUDIO))

Path("videos").mkdir(exist_ok=True)
Path("posters").mkdir(exist_ok=True)
saida, capa = f"videos/{slug}.mp4", f"posters/{slug}.jpg"

cena = f"fps=30,scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
audio = "aformat=sample_rates=48000:channel_layouts=stereo"
n = len(entradas)
filtro = ";".join(f"[{i}:v]{cena}[v{i}];[{i}:a]{audio}[a{i}]" for i in range(n))
filtro += ";" + "".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[v][a]"

cmd = ["ffmpeg", "-y"]
for e in entradas:
    cmd += ["-i", e]
cmd += ["-filter_complex", filtro, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "28",
        "-maxrate", str(video_bps), "-bufsize", str(video_bps * 2), "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", str(AUDIO), "-movflags", "+faststart", saida]
subprocess.run(cmd, check=True)

subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", str(min(20, durs[0] / 2)), "-i", entradas[0],
                "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", capa], check=True)

mm, ss = divmod(round(total), 60)
print(f"\nTamanho final: {Path(saida).stat().st_size / 1024 / 1024:.1f} MB")
print("\nCole na lista VIDEOS do index.html:")
print(f'{{ id: "{slug}", titulo: {json.dumps(titulo, ensure_ascii=False)}, descricao: "", '
      f'duracao: "{mm}:{ss:02d}", src: "{saida}", capa: "{capa}" }},')
