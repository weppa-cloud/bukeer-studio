// App entry — wires sections together, handles modal + tweaks + edit-mode bridge
// + multi-page router (home, listing, detail, search, contact)

function App() {
  const [tweaks, setTweaks] = useState(window.__TWEAKS__ || { palette: "andes", density: "roomy", heroVariant: "image", showStickyCTA: true });
  const [modalPkg, setModalPkg] = useState(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // --- Router ---
  const [page, setPage] = useState(() => {
    const h = (location.hash || "").replace("#/", "");
    if (h.startsWith("paquete/")) return { name: "detail", slug: h.split("/")[1] };
    if (h.startsWith("actividad/")) return { name: "activity", slug: h.split("/")[1] };
    if (h.startsWith("blog/")) return { name: "post", slug: h.split("/")[1] };
    if (h.startsWith("planner/")) return { name: "planner", slug: h.split("/")[1] };
    if (h === "planners") return { name: "planners" };
    if (h === "paquetes") return { name: "listing" };
    if (h === "buscar") return { name: "search" };
    if (h === "contacto") return { name: "contact" };
    if (h === "blog") return { name: "blog" };
    if (h === "experiencias") return { name: "experiences" };
    return { name: "home" };
  });

  const nav = (name, extra={}) => {
    const p = { name, ...extra };
    setPage(p);
    const hashes = {
      home: "", listing: "#/paquetes", search: "#/buscar", contact: "#/contacto",
      detail: `#/paquete/${extra.pkg?.id||""}`,
      activity: `#/actividad/${extra.act?.id||""}`,
      blog: "#/blog", post: `#/blog/${extra.post?.id||""}`,
      experiences: "#/experiencias",
      planners: "#/planners",
      planner: `#/planner/${extra.planner?.id||""}`,
    };
    history.replaceState(null, "", hashes[name] ?? "");
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.palette = tweaks.palette;
    root.dataset.density = tweaks.density;
  }, [tweaks.palette, tweaks.density]);

  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const openCot = () => nav("contact");
  const openDetail = (pkg) => nav("detail", { pkg });
  const openPost = (post) => nav("post", { post });

  const renderPage = () => {
    switch (page.name) {
      case "listing":
        return <PackagesListing onNav={nav} onOpenDetail={openDetail} />;
      case "detail":
        const pkg = page.pkg || PACKAGES.find(p => p.id === page.slug) || PACKAGES[0];
        return <PackageDetailV2 pkg={pkg} onNav={nav} />;
      case "activity":
        const act = page.act || ACTIVITIES.find(a => a.id === page.slug) || ACTIVITIES[0];
        return <ActivityDetail act={act} onNav={nav} />;
      case "search":
        return <SearchPage onNav={nav} onOpenDetail={openDetail} />;
      case "contact":
        return <ContactPage onNav={nav} />;
      case "blog":
        return <BlogList onNav={nav} onOpenPost={openPost} />;
      case "post":
        const post = page.post || BLOG_POSTS.find(p => p.id === page.slug) || BLOG_POSTS[0];
        return <BlogPost post={post} onNav={nav} onOpenPost={openPost} />;
      case "experiences":
        return <ExperiencesPage onNav={nav} />;
      case "planners":
        return <PlannersList onNav={nav} onOpenPlanner={(planner)=>nav("planner", { planner })} />;
      case "planner":
        const pl = page.planner || PLANNERS.find(x => x.id === page.slug) || PLANNERS[0];
        return <PlannerDetail planner={pl} onNav={nav} onOpenDetail={openDetail} />;
      case "home":
      default:
        return (
          <>
            <Hero onSearch={()=>nav("search")} />
            <Trust />
            <Destinations />
            <ExploreMap onNav={nav} />
            <Packages onOpen={openDetail} />
            <Stats />
            <Promise />
            <PlannersSection onNav={nav} />
            <Testimonials />
            <Faq />
            <div id="cta-final"><CtaBanner onOpen={openCot} /></div>
          </>
        );
    }
  };

  return (
    <>
      <SiteHeader onOpen={openCot} onNav={nav} current={page.name} />
      {renderPage()}
      <Footer onNav={nav} />
      <Whatsapp />
      <Tweaks open={tweaksOpen} tweaks={tweaks} setTweaks={setTweaks} />
      {modalPkg && <PackageModal pkg={modalPkg} onClose={()=>setModalPkg(null)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
