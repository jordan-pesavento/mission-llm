import UserButton, { useInlineUserMounted } from "./UserButton";

export { TopBarUser } from "./UserButton";

/**
 * Wraps every signed-in page. The avatar lives in the top-right corner: the
 * chat top bar renders it in flow (TopBarUser); every other page gets the
 * floating UserButton at the same spot.
 */
export default function UserMenu({ children }) {
  const inlineUserMounted = useInlineUserMounted();

  return (
    <div className="w-auto h-auto">
      {!inlineUserMounted && <UserButton />}
      {children}
    </div>
  );
}
