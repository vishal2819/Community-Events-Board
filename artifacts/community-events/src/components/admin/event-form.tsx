"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  useCreateEvent, useUpdateEvent, getListAdminEventsQueryKey, getListEventsQueryKey, getGetEventQueryKey, getGetAdminEventQueryKey, getGetEventMetaQueryKey, getGetFeedQueryKey,
  type Event as CivicEvent, type Category,
} from "@workspace/api-client-react";
import { TextField, TextAreaField, SelectField, FormAlert } from "../field";
import { CATEGORIES, errorMessage, errorStatus, fromIstInput, toIstInput } from "../civic-lib";

type Errs = Partial<Record<"title" | "city" | "startsAt" | "price" | "description" | "imageUrl", string>>;

export function EventForm({ event }: { event?: CivicEvent }) {
  const router = useRouter();
  const qc = useQueryClient();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const [title, setTitle] = useState(event?.title ?? "");
  const [category, setCategory] = useState<Category>(event?.category ?? "MUSIC");
  const [city, setCity] = useState(event?.city ?? "");
  const [startsAt, setStartsAt] = useState(event ? toIstInput(event.startsAt) : "");
  const [price, setPrice] = useState(event?.price ?? "0");
  const [description, setDescription] = useState(event?.description ?? "");
  const [imageUrl, setImageUrl] = useState(event?.imageUrl ?? "");
  const [isActive, setIsActive] = useState(event?.isActive ?? true);
  const [errors, setErrors] = useState<Errs>({});
  const [formError, setFormError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    const e: Errs = {};
    if (title.trim().length < 3 || title.trim().length > 120) e.title = "Title must be 3 to 120 characters.";
    if (city.trim().length < 2 || city.trim().length > 80) e.city = "City must be 2 to 80 characters.";
    const iso = startsAt ? fromIstInput(startsAt) : null;
    if (!iso) e.startsAt = "Choose a start date and time (IST).";
    if (!/^\d+(\.\d{1,2})?$/.test(price.trim())) e.price = "Enter rupees like 499 or 499.50.";
    if (description.trim().length < 10 || description.trim().length > 4000) e.description = "Description must be 10 to 4000 characters.";
    if (imageUrl.trim() && !/^https?:\/\/\S+$/.test(imageUrl.trim())) e.imageUrl = "Use a full http(s) image URL.";
    setErrors(e);
    if (Object.keys(e).length || !iso) return;

    const body = { title: title.trim(), category, city: city.trim(), startsAt: iso, price: price.trim(), description: description.trim(), imageUrl: imageUrl.trim() || null, isActive };
    const done = (id: string) => {
      qc.invalidateQueries({ queryKey: getListAdminEventsQueryKey() });
      qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetEventMetaQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      qc.invalidateQueries({ queryKey: getGetEventQueryKey(id) });
      qc.invalidateQueries({ queryKey: getGetAdminEventQueryKey(id) });
      router.push("/admin/events");
      router.refresh();
    };
    const onError = (err: unknown) =>
      setFormError(errorStatus(err) === 409 ? "Someone else changed this event. Reload the page and try again." : errorMessage(err));

    if (event) update.mutate({ id: event.id, data: { ...body, updatedAt: event.updatedAt } }, { onSuccess: (r) => done(r.data.id), onError });
    else create.mutate({ data: body }, { onSuccess: (r) => done(r.data.id), onError });
  };

  return (
    <form onSubmit={submit} noValidate className="surface p-5 md:p-8 grid md:grid-cols-2 gap-5 max-w-4xl" data-testid="form-event">
      {formError && <div className="md:col-span-2"><FormAlert message={formError} /></div>}
      <div className="md:col-span-2"><TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} maxLength={120} /></div>
      <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
        {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </SelectField>
      <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} maxLength={80} />
      <TextField label="Starts at (IST)" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} error={errors.startsAt} hint="Asia/Kolkata time. Stored as UTC." />
      <TextField label="Price (INR)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={errors.price} hint="0 means free." />
      <div className="md:col-span-2"><TextAreaField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} maxLength={4000} /></div>
      <div className="md:col-span-2"><TextField label="Image URL (optional)" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} error={errors.imageUrl} /></div>
      <label className="md:col-span-2 flex items-center gap-3 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-5 accent-[#3525cd]" />
        Active (visible on the public board)
      </label>
      <div className="md:col-span-2 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
        <button type="button" className="btn btn-soft" onClick={() => router.push("/admin/events")}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={pending} data-testid="button-save-event">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} {event ? "Save changes" : "Publish event"}
        </button>
      </div>
    </form>
  );
}
