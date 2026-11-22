import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_ICONS, CURRENCIES, type Category, type CategoryIcon as IconName, type Currency, type TxType } from '@ledgerline/shared';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog, Drawer } from '../../components/ui/Dialogs';
import { SelectField, TextField } from '../../components/ui/Field';
import { useToast } from '../../components/ui/Toast';
import { CategoryIcon, ICONS } from '../../components/CategoryIcon';
import { ThemeSwitch } from '../../components/ThemeSwitch';
import { ApiError } from '../../lib/api';
import { useCategories, useDeleteCategory, useMe, useSaveCategory, useUpdateProfile } from '../../lib/queries';

export function SettingsPage() {
  const { data: me } = useMe();
  const { data: categories = [] } = useCategories();
  const update = useUpdateProfile();
  const toast = useToast();
  const [name, setName] = useState(me?.name ?? '');
  const [editing, setEditing] = useState<{ category?: Category; type: TxType } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const del = useDeleteCategory();

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <section aria-labelledby="profile-heading" className="mt-6 rounded-panel border border-rule bg-surface p-5 sm:p-6">
        <h2 id="profile-heading" className="font-semibold">Profile</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            update.mutate({ name: name.trim() }, { onSuccess: () => toast('Name saved.') });
          }}
        >
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <SelectField
            label="Currency"
            hint="Changes how amounts are shown. It doesn’t convert them."
            value={me?.currency ?? 'USD'}
            onChange={(e) => update.mutate({ currency: e.target.value as Currency }, { onSuccess: () => toast(`Showing amounts in ${e.target.value}.`) })}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </SelectField>
          <Button type="submit" loading={update.isPending} className="sm:mb-[22px]">Save name</Button>
        </form>
      </section>

      <section aria-labelledby="appearance-heading" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-rule bg-surface p-5 sm:p-6">
        <div>
          <h2 id="appearance-heading" className="font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-ink-muted">Auto matches your device’s light or dark setting.</p>
        </div>
        <ThemeSwitch />
      </section>

      {(['EXPENSE', 'INCOME'] as const).map((type) => (
        <section key={type} aria-labelledby={`${type}-heading`} className="mt-6 rounded-panel border border-rule bg-surface">
          <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
            <h2 id={`${type}-heading`} className="font-semibold">{type === 'EXPENSE' ? 'Spending categories' : 'Income categories'}</h2>
            <Button size="sm" onClick={() => setEditing({ type })}>
              <Plus size={16} aria-hidden="true" />
              Add category
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-rule">
            {categories.filter((c) => c.type === type).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="text-sm text-ink-muted">{c.transactionCount} transaction{c.transactionCount === 1 ? '' : 's'}</span>
                </span>
                <Button variant="ghost" size="sm" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ category: c, type })}>
                  <Pencil size={16} />
                </Button>
                <Button variant="ghost" size="sm" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
                  <Trash2 size={16} />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && <CategoryDrawer key={editing.category?.id ?? `new-${editing.type}`} {...editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          body={deleting.transactionCount ? `It has ${deleting.transactionCount} transactions. Move them to another category first, then delete it.` : 'Its budgets are removed too.'}
          confirmLabel="Delete category"
          loading={del.isPending}
          onConfirm={() =>
            del.mutate(deleting.id, {
              onSuccess: () => {
                toast(`${deleting.name} deleted.`);
                setDeleting(null);
              },
              onError: (e) => {
                toast(e.message, { tone: 'error' });
                setDeleting(null);
              },
            })
          }
        />
      )}
    </>
  );
}

function CategoryDrawer({ category, type, onClose }: { category?: Category; type: TxType; onClose: () => void }) {
  const save = useSaveCategory();
  const toast = useToast();
  const [name, setName] = useState(category?.name ?? '');
  const [color, setColor] = useState<string>(category?.color ?? CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState<IconName>(category?.icon ?? 'circle');
  const [error, setError] = useState<string>();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    save.mutate(
      { id: category?.id, body: category ? { name, color: color as never, icon } : { name, type, color: color as never, icon } },
      {
        onSuccess: () => {
          toast(category ? 'Category saved.' : `${name.trim()} added.`);
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError && err.fields?.name ? err.fields.name : err.message),
      },
    );
  };

  return (
    <Drawer
      open
      onOpenChange={(o) => !o && onClose()}
      title={category ? `Edit ${category.name}` : type === 'EXPENSE' ? 'New spending category' : 'New income category'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form="category-form" variant="primary" loading={save.isPending}>
            {category ? 'Save category' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <div className="flex items-center gap-4 rounded-panel bg-sunken p-4">
          <CategoryIcon icon={icon} color={color} size={48} />
          <span className="text-lg font-semibold">{name || 'Category name'}</span>
        </div>
        <TextField label="Name" value={name} maxLength={40} autoFocus onChange={(e) => { setName(e.target.value); setError(undefined); }} error={error} />
        <fieldset>
          <legend className="text-sm font-medium">Colour</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" className="peer sr-only" checked={color === c} onChange={() => setColor(c)} />
                <span className="block h-9 w-9 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink" style={{ backgroundColor: c }} />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Icon</legend>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {CATEGORY_ICONS.map((name) => {
              const Icon = ICONS[name];
              return (
                <label key={name} className="cursor-pointer">
                  <input type="radio" name="icon" className="peer sr-only" checked={icon === name} onChange={() => setIcon(name)} />
                  <span className="grid h-11 place-items-center rounded-control border border-rule text-ink-muted peer-checked:border-ink peer-checked:bg-sunken peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">
                    <Icon size={20} />
                  </span>
                  <span className="sr-only">{name}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}
