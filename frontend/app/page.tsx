export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          ER Viewer
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          A Mermaid diagramming tool with nested ER blocks capability.
          Create clickable regions in parent ER diagrams that drill down into child diagrams.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Create New Diagram
          </button>
          <button className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-80 transition-opacity">
            Open Existing
          </button>
        </div>
      </div>
    </main>
  );
}
