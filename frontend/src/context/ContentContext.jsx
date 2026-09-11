import { createContext, useContext, useEffect, useState } from "react";
import { getContent } from "../lib/api";

const ContentContext = createContext({ content: {}, reload: () => {} });

export function ContentProvider({ children }) {
  const [content, setContent] = useState({});

  const reload = async () => {
    try {
      setContent(await getContent());
    } catch (e) {
      console.warn("Could not load content (backend not set up yet?):", e.message);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <ContentContext.Provider value={{ content, reload }}>
      {children}
    </ContentContext.Provider>
  );
}

export const useContent = () => useContext(ContentContext);
