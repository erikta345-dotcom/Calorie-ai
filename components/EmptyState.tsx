export default function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-gray-300 dark:text-zinc-600 text-sm text-center py-10">{message}</p>
  );
}
