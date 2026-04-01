import api from "./api";

const fallbackColleges = [
	{ id: 1, name: "Delhi Technical University", location: "Delhi", course: "B.Tech CSE", fees: "₹2.1L/year" },
	{ id: 2, name: "Pune Institute of Technology", location: "Pune", course: "BCA", fees: "₹1.2L/year" },
	{ id: 3, name: "Bangalore School of Design", location: "Bangalore", course: "B.Des", fees: "₹3.4L/year" },
];

export async function searchColleges(filters) {
	try {
		const response = await api.get("/colleges", { params: filters });
		return response.data;
	} catch {
		const query = (filters?.search || "").toLowerCase();
		const location = (filters?.location || "").toLowerCase();
		const course = (filters?.course || "").toLowerCase();

		const filtered = fallbackColleges.filter((college) => {
			const matchesSearch = !query || college.name.toLowerCase().includes(query);
			const matchesLocation = !location || college.location.toLowerCase().includes(location);
			const matchesCourse = !course || college.course.toLowerCase().includes(course);
			return matchesSearch && matchesLocation && matchesCourse;
		});

		return { colleges: filtered };
	}
}
