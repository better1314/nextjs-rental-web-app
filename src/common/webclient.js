import axios from "axios"

export async function fetcher(url, options = {}) {
  try {
    const res = await axios.post(
      url,
      options.body ? JSON.parse(options.body) : {}, // actual POST body
      {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }
    );

    const data = res.data;

    if (data.responseStatus === "0") {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (err) {
    throw new Error(err.message || 'Unexpected error');
  }
}

export async function get(url, options = {}) {
  try {
    const res = await axios.get(
      url,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }
    );

    const data = res.data;

    if (data.responseStatus === "0") {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (err) {
    throw new Error(err.message || 'Unexpected error');
  }
}

export async function fetchImg(url, options = {}) {
  try {
    const res = await axios.get(
      url,
      {
        responseType: "blob",
        headers: {
          ...(options.headers || {}),
        },
      }
    );

    const objectUrl = URL.createObjectURL(res.data);

    if (res.data.responseStatus === "0") {
      throw new Error(data.message || 'Something went wrong');
    }

    return objectUrl;
  } catch (err) {
    throw new Error(err.message || 'Unexpected error');
  }
}