import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocMeta } from "./lib/seo";
import { track } from "./lib/analytics";
import TopNav from "./components/TopNav";
import { BLOG_POSTS, findPost } from "./data/blogPosts";

/**
 * Blog — /blog content marketing surface.
 *
 * Serves both the index and per-post views (Blog handles both paths).
 * Every post is an SEO scaffold pointing at a specific high-intent search
 * term. Real writing goes in `data/blogPosts.js`.
 */
export default function Blog() {
  const { slug } = useParams();
  const post = slug ? findPost(slug) : null;

  useEffect(() => { track(post ? "blog_post_view" : "blog_index_view", post ? { slug } : {}); }, [slug, post]);

  if (slug && post) return <PostView post={post} />;
  if (slug && !post) return <NotFound />;
  return <IndexView />;
}

function IndexView() {
  const navigate = useNavigate();

  useDocMeta({
    title: "Blog · RizeAI — Canadian real estate underwriting analysis",
    description: "Zoning bylaw analysis, deal walkthroughs, and market updates for Canadian brokers, agents, and residential investors. From the RizeAI team.",
  });

  return (
    <div className="bl-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="bl-body">
        <div className="bl-header">
          <div className="bl-eyebrow">
            <span className="bl-eyebrow-dot" />
            BLOG · CANADIAN REAL ESTATE
          </div>
          <h1 className="bl-h1">Bylaw analysis. <span>Deal math. Market updates.</span></h1>
          <p className="bl-sub">
            Short-form writing from the RizeAI team on the zoning changes, market shifts, and underwriting patterns that actually move deals. New posts approximately weekly.
          </p>
        </div>

        <div className="bl-posts">
          {BLOG_POSTS.map((p, i) => (
            <button key={i} className="bl-post-card" onClick={() => navigate(`/blog/${p.slug}`)}>
              <div className="bl-post-tag">{p.tag}</div>
              <div className="bl-post-title">{p.title}</div>
              <div className="bl-post-subtitle">{p.subtitle}</div>
              <div className="bl-post-meta">
                <span>{p.date}</span>
                <span>·</span>
                <span>{p.author}</span>
                <span className="bl-post-arrow">Read →</span>
              </div>
            </button>
          ))}
        </div>

        {/* SUBSCRIBE */}
        <div className="bl-subscribe">
          <div className="bl-subscribe-tag">▸ SUBSCRIBE</div>
          <div className="bl-subscribe-h">One email a week. Zero fluff.</div>
          <p className="bl-subscribe-p">Zoning updates, bylaw changes, deal math. Delivered same day as the /updates monthly investor version.</p>
          <form className="bl-subscribe-form" onSubmit={(e) => {
            e.preventDefault();
            const email = e.target.email.value;
            if (!email) return;
            track("blog_subscribe");
            window.location.href = `mailto:sunni@rizedevelopments.com?subject=Blog%20subscribe&body=Please%20add%20me%20to%20the%20weekly%20blog%20updates.%20Email:%20${encodeURIComponent(email)}`;
          }}>
            <input name="email" type="email" placeholder="you@brokerage.com" className="bl-subscribe-input" required />
            <button type="submit" className="bl-subscribe-btn">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function PostView({ post }) {
  const navigate = useNavigate();

  useDocMeta({
    title: `${post.title} · RizeAI Blog`,
    description: post.subtitle,
    jsonld: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.subtitle,
      "datePublished": post.date,
      "author": { "@type": "Organization", "name": post.author },
      "publisher": { "@type": "Organization", "name": "RizeAI", "url": "https://www.realdealestate.app" },
      "mainEntityOfPage": `https://www.realdealestate.app/blog/${post.slug}`,
    },
  });

  return (
    <div className="bl-wrap">
      <style>{CSS}</style>
      <TopNav />

      <div className="bl-post-body">
        <button className="bl-back" onClick={() => navigate("/blog")}>← All posts</button>

        <div className="bl-post-header">
          <div className="bl-post-tag">{post.tag}</div>
          <h1 className="bl-post-h1">{post.title}</h1>
          <div className="bl-post-subtitle-lg">{post.subtitle}</div>
          <div className="bl-post-meta-full">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>
        </div>

        <article className="bl-post-content">
          {post.body.map((para, i) => (
            <p key={i} className="bl-post-para" dangerouslySetInnerHTML={{ __html: linkify(para) }} />
          ))}
        </article>

        <div className="bl-post-foot">
          <div className="bl-post-foot-h">Want the tool that ships this math?</div>
          <p className="bl-post-foot-p">RizeAI runs zoning-anchored deal verdicts on any Canadian address in 3 seconds. Free tier at 5 lookups/mo.</p>
          <div className="bl-post-foot-row">
            <button className="bl-cta" onClick={() => navigate("/property?addr=2424+Westmount+Rd+NW%2C+Calgary+AB")}>Try RizeAI →</button>
            <button className="bl-cta ghost" onClick={() => navigate("/blog")}>More posts</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Very simple markdown-flavor link parser — matches [text](url) → <a href="url">text</a>.
function linkify(str) {
  return String(str)
    .replace(/</g, "&lt;").replace(/>/g, "&gt;") // basic escape
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#b58900;text-decoration:underline;text-decoration-color:rgba(212,175,55,0.4)">$1</a>');
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="bl-wrap">
      <style>{CSS}</style>
      <TopNav />
      <div className="bl-body" style={{textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:56,marginBottom:14}}>📝</div>
        <h1 style={{fontSize:28,fontWeight:800,marginBottom:10}}>Post not found.</h1>
        <p style={{color:"var(--sub)",marginBottom:22}}>The URL doesn't map to a live post.</p>
        <button className="bl-cta" onClick={() => navigate("/blog")}>← All posts</button>
      </div>
    </div>
  );
}

const CSS = `
  .bl-wrap { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Geist', sans-serif; }
  .bl-body { max-width: 920px; margin: 0 auto; padding: 48px 24px 80px; }
  .bl-post-body { max-width: 720px; margin: 0 auto; padding: 40px 24px 80px; }

  .bl-header { text-align: center; margin-bottom: 44px; padding-bottom: 32px; border-bottom: 1px solid var(--borderf); }
  .bl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--brass-2); background: rgba(212,175,55,0.08); border: 1px solid rgba(212,175,55,0.28); padding: 5px 10px; border-radius: 4px; margin-bottom: 14px; }
  .bl-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--brass); animation: blink 2s infinite; box-shadow: 0 0 8px var(--brass); }
  .bl-h1 { font-size: clamp(30px, 4.5vw, 44px); font-weight: 800; color: var(--text); letter-spacing: -1.6px; line-height: 1.1; margin: 0 0 14px; }
  .bl-h1 span { color: var(--brass); font-style: italic; font-weight: 700; }
  .bl-sub { font-size: 15.5px; color: var(--sub); line-height: 1.65; max-width: 640px; margin: 0 auto; }

  .bl-posts { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
  .bl-post-card { padding: 22px 26px; background: var(--card); border: 1px solid var(--borderf); border-left: 3px solid var(--brass); border-radius: 10px; text-align: left; cursor: pointer; font-family: 'Geist', sans-serif; transition: transform 0.15s, border-color 0.15s; }
  .bl-post-card:hover { transform: translateY(-1px); border-left-color: var(--brass-2); }
  .bl-post-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 8px; }
  .bl-post-title { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; line-height: 1.3; margin-bottom: 6px; }
  .bl-post-subtitle { font-size: 13.5px; color: var(--sub); line-height: 1.55; margin-bottom: 12px; }
  .bl-post-meta { display: flex; gap: 8px; align-items: center; font-family: 'Geist Mono', monospace; font-size: 11px; color: var(--sub); letter-spacing: 0.3px; }
  .bl-post-arrow { margin-left: auto; color: var(--brass-2); font-weight: 800; }

  .bl-subscribe { padding: 24px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.06), rgba(33,85,205,0.04)); border: 1px solid rgba(212,175,55,0.28); border-radius: 12px; text-align: center; }
  .bl-subscribe-tag { font-family: 'Geist Mono', monospace; font-size: 10.5px; font-weight: 800; color: var(--brass-2); letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 8px; }
  .bl-subscribe-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 6px; }
  .bl-subscribe-p { font-size: 13.5px; color: var(--sub); line-height: 1.55; margin-bottom: 14px; }
  .bl-subscribe-form { display: flex; gap: 8px; max-width: 460px; margin: 0 auto; flex-wrap: wrap; }
  .bl-subscribe-input { flex: 1; min-width: 200px; padding: 11px 14px; border-radius: 6px; background: var(--card); border: 1px solid var(--borderf); font-size: 13.5px; font-family: 'Geist', sans-serif; color: var(--text); outline: none; }
  .bl-subscribe-input:focus { border-color: var(--brass); }
  .bl-subscribe-btn { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; cursor: pointer; }

  .bl-back { display: inline-block; padding: 6px 12px; background: transparent; color: var(--sub); border: 1px solid var(--borderf); border-radius: 5px; font-family: 'Geist Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; cursor: pointer; margin-bottom: 24px; }
  .bl-back:hover { color: var(--text); border-color: var(--sub); }

  .bl-post-header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--borderf); }
  .bl-post-h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 800; color: var(--text); letter-spacing: -1.4px; line-height: 1.15; margin: 8px 0 12px; }
  .bl-post-subtitle-lg { font-size: 17px; color: var(--sub); line-height: 1.6; margin-bottom: 14px; }
  .bl-post-meta-full { display: flex; gap: 8px; font-family: 'Geist Mono', monospace; font-size: 11.5px; color: var(--sub); letter-spacing: 0.3px; }

  .bl-post-content { font-size: 16px; color: var(--text); line-height: 1.8; }
  .bl-post-para { margin: 0 0 20px; }

  .bl-post-foot { padding: 26px 26px; background: linear-gradient(135deg, rgba(212,175,55,0.05), rgba(33,85,205,0.03)); border: 1px solid rgba(212,175,55,0.24); border-radius: 12px; text-align: center; margin-top: 40px; }
  .bl-post-foot-h { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.4px; margin-bottom: 8px; }
  .bl-post-foot-p { font-size: 14px; color: var(--sub); line-height: 1.6; margin-bottom: 16px; }
  .bl-post-foot-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

  .bl-cta { padding: 11px 20px; border-radius: 6px; background: var(--brass); color: #0a1128; border: 1px solid var(--brass); font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; }
  .bl-cta.ghost { background: transparent; color: var(--sub); border-color: var(--borderf); }
  .bl-cta.ghost:hover { color: var(--text); border-color: var(--sub); }

  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
`;
