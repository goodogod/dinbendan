$(document).ready(function() {
    //alert('ready');
    //$('#login').click(function () {
    //    $('.form-signin').submit();
    //});

    $('.form-signin').submit(function (event) {
        //alert('click');
        var postData = {
            name:     $('#inputName').val(),
            password: $('#inputPassword').val()
        };

        //alert(JSON.stringify(postData));
        $.ajax({
            url: '/api/v1/auth',
            type: 'POST',
            dataType: 'json',
            data: postData,
            error: function (xhr, status, erorr) {
                alert('error!');
                //alert('AJAX request occurs an error: ' + JSON.stringify(error));
            },
            success: function (res) {
                /*
                res: {
                    success: boolean,
                    message: string,
                    token: token
                }
                */
                /*
                $('.hidden-form').submit(function (event) {
                    $('.token').val(res.token);
                    return true;
                    //this.token = res.token;
                });
                */
                /*
                var redirect = function(url, method) {
                    var form = document.createElement('form');
                    var inputToken = document.createElement('token');
                    form.appendChild(inputToken);
                    form.method = method;
                    form.action = url;
                    form.token = res.token;
                    form.submit();
                };

                redirect('/', 'post');
                */
                window.location.href = '/?token=' + res.token;
                /*
                $.ajax({
                    url: '/',
                    type: 'GET',
                    data: { 'token': res.token },
                    success: function (res) {
                        //alert('response success ! data: ' + JSON.stringify(res));
                        //$(this).text(res);
                        window.location.href = '/';
                    }
                });
                */
            }
        });

        //return false;
        event.preventDefault();

        /*
        $.post('/api/v1/auth', postData,
        function (data, status) {
            alert('post end');
            if (data.success) {
                alert(data.token);
            }
            else {
                alert('Auth failed ! data: ' + JSON.stringify(data) + ', status: ' + status);
            }
        });
        */

        //window.location.href = '';
    });
});