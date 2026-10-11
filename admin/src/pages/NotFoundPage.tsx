import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-lg space-y-4 py-20 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        That Admin page does not exist. Return to the dashboard or go back to
        the previous page.
      </p>
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate('/')
          }
        >
          Back
        </Button>
        <Button onClick={() => navigate('/')}>Dashboard</Button>
      </div>
    </div>
  );
}
