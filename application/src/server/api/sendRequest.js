import 'isomorphic-unfetch';

const port = process.env.PORT || 3000;
const ROOT_URL = process.env.ROOT_URL || `http://localhost:${port}`;

export default async function sendRequest(path, options = {}) {
  const headers = Object.assign({}, options.headers || {}, {
    'Content-type': 'application/json; charset=UTF-8',
  });

  const response = await fetch(
    `${ROOT_URL}${path}`,
    Object.assign({ method: 'POST', credentials: 'same-origin' }, options, { headers }),
  );

  const data = await response.json();

  if (data.error) {
    // throw new Error(data.error);
    console.log(data.error)
  }

  return data;
}