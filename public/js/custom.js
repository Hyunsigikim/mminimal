document.addEventListener('DOMContentLoaded', function() {
    // Comment form functionality
    window.showCommentForm = function(postId) {
        // Hide all comment forms first
        document.querySelectorAll('.comment-form').forEach(form => {
            form.classList.remove('show');
        });

        // Show the specific form
        const form = document.getElementById('comment-form-' + postId);
        if (form) {
            form.classList.add('show');
        }
    };

    window.hideCommentForm = function(postId) {
        const form = document.getElementById('comment-form-' + postId);
        if (form) {
            form.classList.remove('show');
        }
    };

    // Auto-hide comment forms when clicking outside
    document.addEventListener('click', function(event) {
        const commentForms = document.querySelectorAll('.comment-form.show');
        commentForms.forEach(form => {
            if (!form.contains(event.target) &&
                !event.target.classList.contains('add-comment-btn') &&
                !event.target.closest('.add-comment-btn') &&
                !event.target.classList.contains('btn-success') &&
                !event.target.closest('.btn-success')) {
                form.classList.remove('show');
            }
        });
    });

    // Form validation
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            const textarea = form.querySelector('textarea[name="content"]');
            if (textarea && !textarea.value.trim()) {
                e.preventDefault();
                textarea.focus();
                return false;
            }
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
