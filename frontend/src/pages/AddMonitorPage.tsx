import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { api, type Monitor, type NewMonitorPayload } from "../api";

export function AddMonitorPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<NewMonitorPayload>({
    name: "",
    target: "",
    monitor_type: "http",
    interval_seconds: 300,
    timeout_seconds: 5,
    expected_status_code: 200,
    expected_dns_result: "",
    enabled: true,
    tags: []
  });
  const [tagText, setTagText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NewMonitorPayload>(key: K, value: NewMonitorPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        expected_status_code: form.monitor_type === "http" ? form.expected_status_code : null,
        expected_dns_result: form.monitor_type === "dns" ? form.expected_dns_result || null : null,
        tags: tagText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      };
      const created: Monitor = await api.createMonitor(payload);
      navigate(`/monitors/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create monitor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">New target</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-950">Add Monitor</h1>
      </div>

      <form className="panel space-y-5 p-5" onSubmit={submit}>
        {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-stone-700">Monitor name</span>
            <input
              className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
              required
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-stone-700">Monitor type</span>
            <select
              className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
              value={form.monitor_type}
              onChange={(event) => update("monitor_type", event.target.value as NewMonitorPayload["monitor_type"])}
            >
              <option value="http">HTTP/HTTPS</option>
              <option value="dns">DNS resolution</option>
              <option value="tcp">TCP port</option>
              <option value="icmp">ICMP ping</option>
            </select>
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-stone-700">Target</span>
          <input
            className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm"
            required
            placeholder="https://example.com or host:port"
            value={form.target}
            onChange={(event) => update("target", event.target.value)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-stone-700">Interval seconds</span>
            <input
              className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
              min={30}
              type="number"
              value={form.interval_seconds}
              onChange={(event) => update("interval_seconds", Number(event.target.value))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-stone-700">Timeout seconds</span>
            <input
              className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
              min={1}
              type="number"
              value={form.timeout_seconds}
              onChange={(event) => update("timeout_seconds", Number(event.target.value))}
            />
          </label>
          {form.monitor_type === "http" && (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Expected HTTP code</span>
              <input
                className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
                min={100}
                max={599}
                type="number"
                value={form.expected_status_code ?? 200}
                onChange={(event) => update("expected_status_code", Number(event.target.value))}
              />
            </label>
          )}
          {form.monitor_type === "dns" && (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-stone-700">Expected DNS result</span>
              <input
                className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
                value={form.expected_dns_result ?? ""}
                onChange={(event) => update("expected_dns_result", event.target.value)}
              />
            </label>
          )}
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-stone-700">Tags</span>
          <input
            className="focus-ring w-full rounded-md border border-stone-300 px-3 py-2"
            placeholder="core, firewall, production"
            value={tagText}
            onChange={(event) => setTagText(event.target.value)}
          />
        </label>

        <label className="flex items-center gap-3">
          <input
            className="h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-600"
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />
          <span className="text-sm font-medium text-stone-700">Enabled</span>
        </label>

        <div className="flex justify-end">
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Monitor"}
          </button>
        </div>
      </form>
    </div>
  );
}

