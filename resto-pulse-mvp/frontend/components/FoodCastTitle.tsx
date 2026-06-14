type Props = {
  size?: 'sm' | 'md';
};

export function FoodCastTitle({ size = 'sm' }: Props) {
  const isMd = size === 'md';
  return (
    <span className={`font-extrabold ${isMd ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
      <span className="text-content">Food</span>
      <span className="text-brand">Cast</span>
    </span>
  );
}
