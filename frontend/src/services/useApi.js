import { useCallback, useEffect, useState } from 'react';
import API, { errorMessage } from './api';

// Loads data from the backend: const { data, loading, error, reload } = useApi('/portal/grades')
export default function useApi(url, initialData = null) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  // The request (url + reload count) whose response is currently shown.
  const [loadedRequest, setLoadedRequest] = useState(null);
  const request = `${url}#${version}`;

  useEffect(() => {
    let active = true;
    API.get(url)
      .then((response) => {
        if (!active) return;
        setData(response.data);
        setError('');
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoadedRequest(`${url}#${version}`));
    return () => {
      active = false;
    };
  }, [url, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, setData, loading: loadedRequest !== request, error, reload };
}
