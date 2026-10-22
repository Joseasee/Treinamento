"""Junta e comprime vídeos para o site. O arquivo final fica abaixo de 50 MB (limite do Supabase gratuito).

Uso (dentro da pasta do site, com o ffmpeg instalado):
    python adicionar_video.py slug "Título do vídeo" parte1.mp4 [parte2.mp4 ...]

Gera originais/<slug>.mp4 e originais/<slug>.jpg (ficam só no seu computador) e imprime o comando
para enviá-los ao Supabase.
Dica: também dá para enviar o vídeo direto pelo site, entrando com a senha de ADM (painel "Administração").
"""
import json
import subprocess
import sys
from pathlib import Path

if len(sys.argv) < 4:
    sys.exit(__doc__)
slug, titulo, *entradas = sys.argv[1:]

ALVO = 45 * 1024 * 1024  # bytes: margem abaixo dos 50 MB do Supabase gratuito
AUDIO = 80_000           # bits/s


def ffprobe(*args):
    cmd = ["ffprobe", "-v", "error", "-of", "csv=p=0", *args]
    return subprocess.check_output(cmd, text=True).strip()


w, h = ffprobe("-select_streams", "v:0", "-show_entries", "stream=width,height", entradas[0]).split(",")[:2]
durs = [float(ffprobe("-show_entries", "format=duration", e)) for e in entradas]
total = sum(durs)
# teto de bitrate calculado para o arquivo final nunca passar de ALVO
video_bps = max(150_000, int(ALVO * 8 / total - AUDIO))

Path("originais").mkdir(exist_ok=True)
saida, capa = f"originais/{slug}.mp4", f"originais/{slug}.jpg"

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
titulo_sql = titulo.replace("'", "''")
print("\nPróximos passos no Supabase:")
print(f"1) Storage → bucket videos → Upload: {slug}.mp4 e {slug}.jpg (da pasta originais)")
print("2) SQL Editor → rode (troque a descrição e a ordem se quiser):")
print(f"insert into public.catalogo (id, titulo, descricao, duracao, arquivo, capa, ordem) values "
      f"('{slug}', '{titulo_sql}', '', '{mm}:{ss:02d}', '{slug}.mp4', '{slug}.jpg', 99);")
