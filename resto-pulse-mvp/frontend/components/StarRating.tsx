'use client';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
};

export function StarRating({ value, onChange, readonly = false }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`text-2xl transition ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${star <= value ? 'text-amber-400' : 'text-slate-600'}`}
          aria-label={`${star} yildiz`}>
          ★
        </button>
      ))}
    </div>
  );
}
