import { Suspense } from "react";
import { StayView } from "./stay-view";

export default async function StayPage({ params }: PageProps<"/stays/[id]">) {
  const { id } = await params;
  return (
    <Suspense>
      <StayView id={Number(id)} />
    </Suspense>
  );
}
