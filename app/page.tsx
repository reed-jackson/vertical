import Image from "next/image";
import { VertiCal } from "@/components/verti-cal";
import { Container } from "@radix-ui/themes";

export default function Home() {
	return (
		<main>
			<Container size="1">
				<VertiCal />
			</Container>
		</main>
	);
}
