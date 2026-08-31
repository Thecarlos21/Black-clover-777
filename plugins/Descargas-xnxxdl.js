import fetch from 'node-fetch';
import cheerio from 'cheerio';

const handler = async (m, {conn, args, command, usedPrefix}) => {
  const emoji = global.emoji || '✨'
  const emoji2 = '⚠️'
  const msm = '❌'

  if (!db.data.chats[m.chat].nsfw && m.isGroup) {
    return conn.reply(m.chat, `${emoji} El contenido *NSFW* está desactivado en este grupo.\n> Un administrador puede activarlo con el comando » *#nsfw on*`, m);
  }

  if (!args[0]) {
    return conn.reply(m.chat, `${emoji} Por favor, envía un link de Xnxx para descargar el video.\nUso: ${usedPrefix}${command} <link de Xnxx>`, m);
  }

  try {
    await conn.reply(m.chat, `${emoji} El vídeo está siendo procesado, espere un momento...\n\n- El tiempo de envío depende del peso y duración del video.`, m);
    let xnxxLink = '';

    if (args[0].includes('xnxx')) {
      xnxxLink = args[0];
    } else {
      const index = parseInt(args[0]) - 1;
      if (index >= 0) {
        if (Array.isArray(global.videoListXXX) && global.videoListXXX.length > 0) {
          const matchingItem = global.videoListXXX.find((item) => item.from === m.sender);
          if (matchingItem) {
            if (index < matchingItem.urls.length) {
              xnxxLink = matchingItem.urls[index];
            } else {
              throw `${emoji2} No se encontró un enlace para ese número, por favor ingrese un número entre el 1 y el ${matchingItem.urls.length}.`;
            }
          } else {
            throw `${emoji2} Para poder usar este comando de esta forma (${usedPrefix + command} <numero>), por favor realiza la búsqueda con el comando ${usedPrefix}xnxxsearch <texto>`;
          }
        } else {
          throw `${emoji2} Para poder usar este comando de esta (${usedPrefix + command} <numero>), por favor realiza la búsqueda con el comando ${usedPrefix}xnxxsearch <texto>`;
        }
      }
    }

    const res = await xnxxdl(xnxxLink);
    const json = await res.result.files;
    const dl = json.high || json.HLS || json.low
    if (!dl) throw `No se pudo extraer el video`
    await conn.sendMessage(m.chat, {document: {url: dl}, mimetype: 'video/mp4', fileName: res.result.title + '.mp4'}, {quoted: m});
  } catch (error) {
    return conn.reply(m.chat, `${msm} Ocurrió un error.\n\n- El enlace debe ser similar a:\n◉ https://www.xnxx.com/video-14lcwbe8/rubia_novia_follada_en_cuarto_de_bano\n\nDetalles del error: ${error.message || error}`, m);
  }
};

handler.command = ['xnxxdl'];
handler.register = true;
handler.group = false;
handler.coin = 10;

export default handler;

async function xnxxdl(URL) {
  return new Promise((resolve, reject) => {
    fetch(`${URL}`, {method: 'get', headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'en-US,en;q=0.9'}}).then((res) => res.text()).then((res) => {
      const $ = cheerio.load(res, {xmlMode: false});
      const title = $('meta[property="og:title"]').attr('content') || 'xnxx_video';
      const duration = $('meta[property="og:duration"]').attr('content');
      const image = $('meta[property="og:image"]').attr('content');
      const videoType = $('meta[property="og:video:type"]').attr('content');
      const videoWidth = $('meta[property="og:video:width"]').attr('content');
      const videoHeight = $('meta[property="og:video:height"]').attr('content');
      const info = $('span.metadata').text();
      const html = res

      const get = (re) => {
        const m = html.match(re)
        return m? m[1] : null
      }

      const files = {
        low: get(/setVideoUrlLow\(['"](.*?)['"]\)/) || get(/html5player\.setVideoUrlLow\(['"](.*?)['"]\)/),
        high: get(/setVideoUrlHigh\(['"](.*?)['"]\)/) || get(/html5player\.setVideoUrlHigh\(['"](.*?)['"]\)/),
        HLS: get(/setVideoHLS\(['"](.*?)['"]\)/) || get(/html5player\.setVideoHLS\(['"](.*?)['"]\)/) || get(/"hls":\s*"(.*?)"/) || get(/source src="(.*?.m3u8.*?)"/),
        thumb: get(/setThumbUrl\(['"](.*?)['"]\)/),
        thumb69: get(/setThumbUrl169\(['"](.*?)['"]\)/),
        thumbSlide: get(/setThumbSlide\(['"](.*?)['"]\)/),
        thumbSlideBig: get(/setThumbSlideBig\(['"](.*?)['"]\)/)
      };

      if (!files.high &&!files.low &&!files.HLS) {
        const mp4 = get(/<source[^>]+src="(https?:\/\/[^"]+\.mp4[^"]*)"/i) || get(/videoUrl['"]?\s*[:=]\s*['"](https?:\/\/[^'"]+\.mp4[^'"]*)['"]/i)
        if (mp4) files.high = mp4
      }

      resolve({status: 200, result: {title, URL, duration, image, videoType, videoWidth, videoHeight, info, files}});
    }).catch((err) => reject({code: 503, status: false, result: err}));
  });
}