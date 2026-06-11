"""
EXAMOS - Database Seeder
Creates demo users and sample exam data for hackathon presentation.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.exam import Exam
from app.models.question import Question
from app.services.auth_service import hash_password


async def seed_database(db: AsyncSession):
    """
    Seed the database with demo users and a sample exam.
    Only seeds if no users exist (idempotent).
    """
    # Check if already seeded
    result = await db.execute(select(User).limit(1))
    if result.scalar_one_or_none():
        return  # Already seeded

    # Create demo users
    users = [
        User(
            email="teacher@examos.ai",
            password_hash=hash_password("teacher123"),
            name="Dr. Sarah Chen",
            role="teacher",
        ),
        User(
            email="student@examos.ai",
            password_hash=hash_password("student123"),
            name="Alex Johnson",
            role="student",
        ),
        User(
            email="student2@examos.ai",
            password_hash=hash_password("student123"),
            name="Maria Garcia",
            role="student",
        ),
        User(
            email="admin@examos.ai",
            password_hash=hash_password("admin123"),
            name="System Admin",
            role="admin",
        ),
    ]

    for user in users:
        db.add(user)
    await db.flush()

    # Create a sample exam
    teacher = users[0]
    exam = Exam(
        title="Introduction to Computer Science",
        description="A comprehensive exam covering fundamental CS concepts including algorithms, data structures, and programming basics.",
        teacher_id=teacher.id,
        duration_minutes=30,
        is_active=True,
        is_adaptive=True,
        total_questions=15,
    )
    db.add(exam)
    await db.flush()

    # Sample questions with varied difficulties
    sample_questions = [
        # Easy (difficulty 1)
        Question(
            exam_id=exam.id, text="What does CPU stand for?",
            question_type="mcq",
            options=["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing Utility"],
            correct_answer="Central Processing Unit", difficulty=1,
            topic="Computer Hardware", explanation="CPU stands for Central Processing Unit, the primary component that executes instructions.",
        ),
        Question(
            exam_id=exam.id, text="Which of the following is an example of an input device?",
            question_type="mcq",
            options=["Keyboard", "Monitor", "Printer", "Speaker"],
            correct_answer="Keyboard", difficulty=1,
            topic="Computer Hardware", explanation="A keyboard is an input device used to enter data into a computer.",
        ),
        Question(
            exam_id=exam.id, text="What is the binary representation of the decimal number 5?",
            question_type="mcq",
            options=["101", "110", "111", "100"],
            correct_answer="101", difficulty=1,
            topic="Number Systems", explanation="5 in binary is 101 (4+0+1).",
        ),
        # Medium-Easy (difficulty 2)
        Question(
            exam_id=exam.id, text="Which data structure uses FIFO (First In, First Out) principle?",
            question_type="mcq",
            options=["Queue", "Stack", "Array", "Tree"],
            correct_answer="Queue", difficulty=2,
            topic="Data Structures", explanation="A Queue follows FIFO - the first element added is the first to be removed.",
        ),
        Question(
            exam_id=exam.id, text="What does HTML stand for?",
            question_type="mcq",
            options=["HyperText Markup Language", "High Tech Modern Language", "HyperText Machine Language", "Home Tool Markup Language"],
            correct_answer="HyperText Markup Language", difficulty=2,
            topic="Web Development", explanation="HTML stands for HyperText Markup Language, used to structure web pages.",
        ),
        Question(
            exam_id=exam.id, text="Which sorting algorithm has the best average-case time complexity?",
            question_type="mcq",
            options=["Merge Sort - O(n log n)", "Bubble Sort - O(n²)", "Selection Sort - O(n²)", "Insertion Sort - O(n²)"],
            correct_answer="Merge Sort - O(n log n)", difficulty=2,
            topic="Algorithms", explanation="Merge Sort consistently achieves O(n log n) time complexity.",
        ),
        # Medium (difficulty 3)
        Question(
            exam_id=exam.id, text="What is the time complexity of searching in a balanced Binary Search Tree?",
            question_type="mcq",
            options=["O(log n)", "O(n)", "O(n²)", "O(1)"],
            correct_answer="O(log n)", difficulty=3,
            topic="Data Structures", explanation="A balanced BST halves the search space at each step, giving O(log n) complexity.",
        ),
        Question(
            exam_id=exam.id, text="Which protocol is used for secure web communication?",
            question_type="mcq",
            options=["HTTPS", "HTTP", "FTP", "SMTP"],
            correct_answer="HTTPS", difficulty=3,
            topic="Networking", explanation="HTTPS (HTTP Secure) uses TLS/SSL encryption for secure communication.",
        ),
        Question(
            exam_id=exam.id, text="What is polymorphism in Object-Oriented Programming?",
            question_type="mcq",
            options=[
                "The ability of objects to take multiple forms",
                "The process of hiding data",
                "The creation of new classes from existing ones",
                "The grouping of related data"
            ],
            correct_answer="The ability of objects to take multiple forms", difficulty=3,
            topic="OOP Concepts", explanation="Polymorphism allows objects of different classes to be treated as objects of a common superclass.",
        ),
        # Medium-Hard (difficulty 4)
        Question(
            exam_id=exam.id, text="What is the space complexity of Depth-First Search (DFS) on a graph?",
            question_type="mcq",
            options=["O(V)", "O(V+E)", "O(V²)", "O(E)"],
            correct_answer="O(V)", difficulty=4,
            topic="Algorithms", explanation="DFS uses O(V) space for the recursion stack in the worst case.",
        ),
        Question(
            exam_id=exam.id, text="Which design pattern ensures a class has only one instance?",
            question_type="mcq",
            options=["Singleton", "Factory", "Observer", "Strategy"],
            correct_answer="Singleton", difficulty=4,
            topic="Design Patterns", explanation="The Singleton pattern restricts instantiation of a class to a single instance.",
        ),
        Question(
            exam_id=exam.id, text="What is the difference between TCP and UDP?",
            question_type="mcq",
            options=[
                "TCP is connection-oriented and reliable; UDP is connectionless and faster",
                "TCP is faster; UDP is more reliable",
                "TCP uses less bandwidth; UDP uses more bandwidth",
                "There is no significant difference"
            ],
            correct_answer="TCP is connection-oriented and reliable; UDP is connectionless and faster",
            difficulty=4,
            topic="Networking", explanation="TCP provides reliable, ordered delivery while UDP offers speed with less overhead.",
        ),
        # Hard (difficulty 5)
        Question(
            exam_id=exam.id, text="What is the amortized time complexity of dynamic array insertion?",
            question_type="mcq",
            options=["O(1)", "O(n)", "O(log n)", "O(n²)"],
            correct_answer="O(1)", difficulty=5,
            topic="Data Structures", explanation="While individual resizing operations are O(n), amortized over all insertions it's O(1).",
        ),
        Question(
            exam_id=exam.id, text="Which problem is NOT solvable in polynomial time (assuming P ≠ NP)?",
            question_type="mcq",
            options=[
                "Traveling Salesman Problem (optimal)",
                "Binary Search",
                "Dijkstra's shortest path",
                "Merge Sort"
            ],
            correct_answer="Traveling Salesman Problem (optimal)", difficulty=5,
            topic="Computational Theory", explanation="TSP is NP-hard; finding the optimal solution requires exponential time.",
        ),
        Question(
            exam_id=exam.id, text="What is the CAP theorem in distributed systems?",
            question_type="mcq",
            options=[
                "A system can guarantee at most 2 of: Consistency, Availability, Partition tolerance",
                "A system must have Caching, Authentication, and Performance",
                "A system should prioritize Cost, Agility, and Performance",
                "A system needs Concurrency, Atomicity, and Persistence"
            ],
            correct_answer="A system can guarantee at most 2 of: Consistency, Availability, Partition tolerance",
            difficulty=5,
            topic="Distributed Systems", explanation="The CAP theorem states that a distributed system cannot simultaneously provide all three guarantees.",
        ),
    ]

    for q in sample_questions:
        db.add(q)

    await db.commit()
    print("[OK] Database seeded with demo users and sample exam!")
