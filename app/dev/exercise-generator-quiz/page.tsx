import { Quiz } from "./_components/quiz";

// Server-component wrapper. De interactie + state zit in <Quiz />,
// hier alleen routing en metadata. De page is bewust dun zodat de
// client-bundle alleen de quiz-code bevat.
export default function ExerciseGeneratorQuizPage() {
  return <Quiz />;
}
