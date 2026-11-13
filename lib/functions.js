
import axios from 'axios'
import FormData from 'form-data'

export async function uploadImage(buffer) {
  try {
    if (!buffer) throw new Error('No se recibió ninguna imagen')

    const form = new FormData()
    form.append('file', buffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    })

    const response = await axios.post(
      'https://tmpfiles.org/api/v1/upload',
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 60000
      }
    )

    const data = response.data

    if (!data?.data?.url) {
      throw new Error('No se pudo obtener la URL de la imagen')
    }

    return data.data.url.replace(
      'tmpfiles.org/',
      'tmpfiles.org/dl/'
    )

  } catch (error) {
    console.error('Error uploadImage:', error.message)
    throw error
  }
}
