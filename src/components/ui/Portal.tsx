import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export const Portal: React.FC<PortalProps> = ({ children }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.top = '0';
    mount.style.left = '0';
    mount.style.width = '100%';
    mount.style.height = '100%';
    mount.style.zIndex = '999999';
    mount.style.pointerEvents = 'none';
    
    document.body.appendChild(mount);
    mountRef.current = mount;

    return () => {
      if (mountRef.current) {
        document.body.removeChild(mountRef.current);
      }
    };
  }, []);

  return mountRef.current ? createPortal(children, mountRef.current) : null;
};
