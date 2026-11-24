export default function ComingSoon({ name, phase }) {
  return (
    <section className="card">
      <h1>{name}</h1>
      <p className="muted">This module has not been built yet. It is planned for Phase {phase}.</p>
    </section>
  );
}
