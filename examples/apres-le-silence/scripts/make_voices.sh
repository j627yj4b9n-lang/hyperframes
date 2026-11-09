#!/usr/bin/env bash
# Voices for « Après le silence » ep. 1 — local Kokoro TTS (ff_siwis) + ffmpeg treatment.
# Male voices are the French voice pitched down with tempo kept; phone voices are band-limited.
set -euo pipefail
cd "$(dirname "$0")/../assets/audio"
mkdir -p raw
tts() { npx hyperframes tts "$2" -v ff_siwis -s "$3" -o "raw/$1.wav" --json > /dev/null; }
tts n1 "La dernière nuit où le monde était normal… personne ne savait que c'était la dernière." 1.07
tts m1 "C'est quoi encore cette connerie ?" 0.95
tts w1 "Aidez-moi ! S'il vous plaît !" 1.15
tts w2 "Écoute-moi… ne fais surtout pas de bruit…" 0.85
tts m2 "Qui êtes-vous ?" 0.9
tts w3 "Je suis dans ton appartement." 0.8
tts s1 "Aaaaaaaaaaaaah !" 0.7
tts s2 "Aaaaaaaaah… non !" 0.75
male() { ffmpeg -y -v error -i "raw/$1.wav" -af "asetrate=24000*$2,aresample=48000,atempo=$(python3 -c "print(1/$2)"),$3" -ac 2 "$4.wav"; }
male n1 0.78 "equalizer=f=140:t=q:w=1:g=5,equalizer=f=3000:t=q:w=1.5:g=-2,aecho=0.8:0.6:70|140:0.22|0.12,volume=1.4" vo-narrator
male m1 0.80 "lowpass=f=6000,equalizer=f=150:t=q:w=1:g=3,volume=0.9" vo-man-1
male m2 0.80 "lowpass=f=7000,equalizer=f=150:t=q:w=1:g=3,volume=1.0" vo-man-2
ffmpeg -y -v error -i raw/w1.wav -af "asetrate=24000*1.08,aresample=48000,highpass=f=350,lowpass=f=3200,aecho=0.8:0.75:190|420|700:0.45|0.3|0.18,volume=0.8" -ac 2 vo-woman-street.wav
phone="highpass=f=320,lowpass=f=3300,acompressor=threshold=0.1:ratio=4,volume=1.3"
ffmpeg -y -v error -i raw/w2.wav -af "aresample=48000,$phone" -ac 2 vo-phone-1.wav
ffmpeg -y -v error -i raw/w3.wav -af "asetrate=24000*0.93,aresample=48000,$phone" -ac 2 vo-phone-2.wav
ffmpeg -y -v error -i raw/s1.wav -af "asetrate=24000*1.18,aresample=48000,highpass=f=400,lowpass=f=2400,aecho=0.8:0.85:300|650|1100:0.5|0.35|0.22,volume=0.55" -ac 2 sfx-scream-1.wav
ffmpeg -y -v error -i raw/s2.wav -af "asetrate=24000*0.82,aresample=48000,highpass=f=250,lowpass=f=1800,aecho=0.8:0.85:350|800|1300:0.5|0.35|0.22,volume=0.5" -ac 2 sfx-scream-2.wav
rm -rf raw
for f in vo-*.wav sfx-scream-*.wav; do ffmpeg -y -v error -i "$f" -c:a libmp3lame -b:a 192k "${f%.wav}.mp3" && rm "$f"; done
