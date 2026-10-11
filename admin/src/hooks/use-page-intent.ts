import { useSearchParams } from 'react-router-dom';

// Intents survive a deep link or refresh and are removed when the workflow closes.
export function usePageIntent() {
  const [params, setParams] = useSearchParams();
  return {
    recordId: params.get('record'),
    action: params.get('action'),
    query: params.get('q') || '',
    clearIntent: () => setParams({}, { replace: true }),
  };
}
