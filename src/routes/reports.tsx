import { createFileRoute } from '@tanstack/react-router';
import { Reports } from '@/components/pulseiq/Views';
export const Route = createFileRoute('/reports')({ head: () => ({ meta: [{ title: 'Reports — PulseIQ' }, { name: 'description', content: 'Generate a local PDF health summary from the current simulation.' }] }), component: Reports });
