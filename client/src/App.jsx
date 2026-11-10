import { useState } from "react";
import "./App.css";

const TYPES = [
  ["text", "Single-line text"],
  ["textarea", "Multi-line text"],
  ["number", "Number"],
  ["date", "Date"],
  ["dropdown", "Dropdown"],
  ["checkbox", "Checkbox"],
];

export default function App() {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [meta, setMeta] = useState({});
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(null);
  const [touched, setTouched] = useState(false);

  const addField = () =>
    setFields([...fields, { id: "f" + Date.now(), label: "", type: "text", required: false, options: [] }]);
  const updateField = (id, patch) =>
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeField = (id) => setFields(fields.filter((f) => f.id !== id));

  const isEmpty = (f) => {
    const v = values[f.id];
    return f.type === "checkbox" ? v !== true : v === undefined || v === null || v === "";
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (fields.length === 0) return setMsg({ type: "error", text: "Build the form first: add at least one field." });
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type))
      return setMsg({ type: "error", text: "Unsupported file type. Please upload a PDF, PNG, JPG or JPEG." });

    setMsg({ type: "success", text: `Uploaded "${file.name}". Extracting...` });
    setLoading(true);
    setSaved(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fields", JSON.stringify(fields));
      const res = await fetch("http://localhost:5000/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");

      const newValues = {};
      const newMeta = {};
      let notFound = 0;
      fields.forEach((f) => {
        const r = data[f.id];
        let v = r ? r.value : null;
        if (f.type === "number" && (v === null || v === "" || isNaN(Number(v)))) v = null;
        if (v === null || v === undefined || v === "") {
          notFound++;
          newMeta[f.id] = { found: false };
        } else {
          newValues[f.id] = f.type === "number" ? Number(v) : v;
          newMeta[f.id] = { found: true, confidence: r.confidence };
        }
      });
      setValues(newValues);
      setMeta(newMeta);
      setTouched(true);
      setMsg({
        type: notFound ? "warn" : "success",
        text: notFound
          ? `Extraction done. ${notFound} field(s) not found: please fill them manually.`
          : "Extraction done. Review the values and save.",
      });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    setLoading(false);
  };

  const submit = () => {
    setTouched(true);
    const missing = fields.filter((f) => f.required && isEmpty(f));
    if (missing.length)
      return setMsg({ type: "error", text: `Please fill required fields: ${missing.map((f) => f.label || "Untitled").join(", ")}` });
    const out = {};
    fields.forEach((f) => (out[f.label || f.id] = values[f.id] ?? null));
    setSaved(out);
    setMsg({ type: "success", text: "Form saved successfully." });
  };

  const renderInput = (f) => {
    const v = values[f.id];
    const set = (val) => setValues({ ...values, [f.id]: val });
    if (f.type === "textarea") return <textarea value={v ?? ""} onChange={(e) => set(e.target.value)} />;
    if (f.type === "dropdown")
      return (
        <select value={v ?? ""} onChange={(e) => set(e.target.value)}>
          <option value="">-- Select --</option>
          {f.options.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    if (f.type === "checkbox")
      return <input type="checkbox" checked={v === true} onChange={(e) => set(e.target.checked)} />;
    return <input type={f.type} value={v ?? ""} onChange={(e) => set(e.target.value)} />;
  };

  return (
    <div className="app">
      <h1>AI Form Builder & Autofill</h1>
      {msg && <div className={"msg " + msg.type}>{msg.text}</div>}

      <div className="cols">
        <div className="panel">
          <h2>1. Build your form</h2>
          {fields.length === 0 && <p className="hint">No fields yet. Click "Add field".</p>}
          {fields.map((f) => (
            <div className="builder-row" key={f.id}>
              <input placeholder="Field label" value={f.label} onChange={(e) => updateField(f.id, { label: e.target.value })} />
              <select value={f.type} onChange={(e) => updateField(f.id, { type: e.target.value })}>
                {TYPES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
              <label className="req">
                <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, { required: e.target.checked })} /> Required
              </label>
              <button className="del" onClick={() => removeField(f.id)}>Remove</button>
              {f.type === "dropdown" && (
                <input
                  className="full"
                  placeholder="Options, separated by commas"
                  defaultValue={f.options.join(", ")}
                  onChange={(e) => updateField(f.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              )}
            </div>
          ))}
          <button onClick={addField}>+ Add field</button>

          <h2>2. Upload document</h2>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFile} disabled={loading} />
          {loading && <p className="hint">AI is reading your document...</p>}
        </div>

        <div className="panel">
          <h2>3. Live preview / review</h2>
          {fields.length === 0 && <p className="hint">Your form will appear here.</p>}
          {fields.map((f) => {
            const m = meta[f.id];
            const bad = touched && f.required && isEmpty(f);
            const notFound = m && !m.found;
            return (
              <div key={f.id} className={"field" + (bad ? " bad" : "")}>
                <label>
                  {f.label || "Untitled field"} {f.required && <span className="star">*</span>}
                  {m && m.found && <span className={"badge " + m.confidence}>{m.confidence}</span>}
                  {notFound && <span className="badge nf">Not found</span>}
                </label>
                {renderInput(f)}
                {bad && <small>This required field is empty.</small>}
              </div>
            );
          })}
          {fields.length > 0 && <button className="primary" onClick={submit}>Save form</button>}
          {saved && <pre>{JSON.stringify(saved, null, 2)}</pre>}
        </div>
      </div>
    </div>
  );
}