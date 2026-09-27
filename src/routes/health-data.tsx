import { createFileRoute } from '@tanstack/react-router';
import { HealthData } from '@/components/pulseiq/Views';
export const Route = createFileRoute('/health-data')({ head: () => ({ meta: [{ title: 'Health Data — PulseIQ' }, { name: 'description', content: 'Explore simulated health signals and personal trends.' }] }), component: HealthData });
