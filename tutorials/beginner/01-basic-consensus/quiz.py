"""
Quiz for Tutorial 01: Basic Consensus

Test your understanding of distributed consensus concepts.
"""

def run_quiz():
    """Run consensus knowledge quiz"""

    print("=" * 60)
    print("TUTORIAL 01: CONSENSUS QUIZ")
    print("=" * 60)

    questions = [
        {
            "question": "What is distributed consensus?",
            "options": [
                "A. Nodes agreeing on a single value",
                "B. Network protocols",
                "C. Database indexing",
                "D. Load balancing"
            ],
            "answer": "A",
            "explanation": "Distributed consensus is the process of getting multiple nodes to agree on a single data value."
        },
        {
            "question": "What makes consensus challenging?",
            "options": [
                "A. Slow networks",
                "B. Node failures and message loss",
                "C. Large data sizes",
                "D. CPU limitations"
            ],
            "answer": "B",
            "explanation": "Node failures, network delays, and message loss make achieving consensus difficult."
        },
        {
            "question": "What is a quorum?",
            "options": [
                "A. All nodes",
                "B. Majority of nodes needed for decision",
                "C. Random nodes",
                "D. Leader node only"
            ],
            "answer": "B",
            "explanation": "A quorum is the minimum number of nodes needed to make a valid decision, typically a majority."
        },
        {
            "question": "In simple majority voting, what happens with a tie?",
            "options": [
                "A. First vote wins",
                "B. Random selection",
                "C. No consensus (tie)",
                "D. Leader decides"
            ],
            "answer": "C",
            "explanation": "In simple majority voting, a tie means no majority was reached, so no consensus is achieved."
        },
        {
            "question": "What is the benefit of timestamp ordering for concurrent proposals?",
            "options": [
                "A. Faster processing",
                "B. Deterministic conflict resolution",
                "C. Less memory usage",
                "D. Better encryption"
            ],
            "answer": "B",
            "explanation": "Timestamp ordering provides a deterministic way to resolve conflicts when multiple proposals arrive simultaneously."
        },
        {
            "question": "In Paxos, what happens during the Prepare phase?",
            "options": [
                "A. Nodes accept a value",
                "B. Nodes promise not to accept earlier proposals",
                "C. Leader is elected",
                "D. Value is decided"
            ],
            "answer": "B",
            "explanation": "During the Prepare phase, nodes promise not to accept any proposals with earlier proposal numbers."
        },
        {
            "question": "What is a Byzantine fault?",
            "options": [
                "A. Node that crashes",
                "B. Node that sends conflicting information",
                "C. Slow network",
                "D. Disk failure"
            ],
            "answer": "B",
            "explanation": "A Byzantine fault occurs when a node behaves maliciously or erroneously, sending conflicting information."
        },
        {
            "question": "How many nodes can fail in a 5-node Paxos system?",
            "options": [
                "A. 1 node",
                "B. 2 nodes",
                "C. 3 nodes",
                "D. 4 nodes"
            ],
            "answer": "B",
            "explanation": "Paxos can tolerate up to (n-1)/2 failures. For 5 nodes, that's 2 failures."
        }
    ]

    score = 0
    total = len(questions)

    for i, q in enumerate(questions, 1):
        print(f"\n--- Question {i}/{total} ---")
        print(q['question'])
        for opt in q['options']:
            print(f"  {opt}")

        while True:
            answer = input("\nYour answer (A/B/C/D): ").upper().strip()
            if answer in ['A', 'B', 'C', 'D']:
                break
            print("Invalid input. Please enter A, B, C, or D.")

        if answer == q['answer']:
            print("✓ Correct!")
            score += 1
        else:
            print(f"✗ Incorrect. Answer: {q['answer']}")

        print(f"Explanation: {q['explanation']}")

    # Calculate percentage
    percentage = (score / total) * 100

    # Print results
    print("\n" + "=" * 60)
    print(f"QUIZ RESULTS: {score}/{total} ({percentage:.0f}%)")
    print("=" * 60)

    if percentage == 100:
        print("🎉 Perfect score! You've mastered consensus fundamentals!")
    elif percentage >= 75:
        print("👍 Great job! You have a solid understanding of consensus.")
    elif percentage >= 50:
        print("📚 Good start! Review the tutorial to strengthen your understanding.")
    else:
        print("💪 Keep learning! Review the tutorial and try again.")

    # Recommended next steps
    print("\nNext Steps:")
    if percentage >= 75:
        print("  → Ready for Tutorial 02: Origin-Centric Data")
    else:
        print("  → Review Tutorial 01 concepts")
        print("  → Try running main.py with different parameters")
        print("  → Experiment with node failures")

    return score


def practice_scenarios():
    """Practice with custom consensus scenarios"""

    print("\n" + "=" * 60)
    print("PRACTICE SCENARIOS")
    print("=" * 60)

    scenarios = [
        {
            "description": "You have 7 nodes. 2 fail. What's the quorum size?",
            "answer": "4",
            "explanation": "Quorum = (7 // 2) + 1 = 4. Even with 2 failures, 5 nodes remain, so 4 votes are needed."
        },
        {
            "description": "5 nodes propose: [10, 10, 20, 20, 20]. What wins?",
            "answer": "20",
            "explanation": "20 has 3 votes, 10 has 2 votes. 3 is majority of 5."
        },
        {
            "description": "Can Paxos reach consensus with only 1 of 3 nodes responding?",
            "answer": "No",
            "explanation": "Paxos needs quorum of 2 nodes ((3 // 2) + 1 = 2)."
        }
    ]

    correct = 0

    for i, scenario in enumerate(scenarios, 1):
        print(f"\n--- Scenario {i} ---")
        print(scenario['description'])

        answer = input("Your answer: ").strip()

        if answer.lower() == scenario['answer'].lower():
            print("✓ Correct!")
            correct += 1
        else:
            print(f"✗ Incorrect. Answer: {scenario['answer']}")
            print(f"Explanation: {scenario['explanation']}")

    print(f"\nPractice score: {correct}/{len(scenarios)}")


def main():
    """Main quiz execution"""

    # Run main quiz
    score = run_quiz()

    # Offer practice scenarios
    print("\n" + "=" * 60)
    practice = input("Would you like to try practice scenarios? (y/n): ").lower()
    if practice == 'y':
        practice_scenarios()

    print("\n" + "=" * 60)
    print("Thanks for completing the quiz!")
    print("=" * 60)


if __name__ == "__main__":
    main()
