import axios from 'axios'

/**
 * Cliente HTTP. Solo httpStoreApi debe importarlo: ningún componente
 * conoce Axios ni la forma de la respuesta del servidor.
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

export default client
